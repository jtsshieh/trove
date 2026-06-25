'use client';

import { useRender } from '@base-ui/react/use-render';
import {
	type AnyFieldApi,
	type DeepKeys,
	type ReactFormExtendedApi,
	useForm,
	useStore,
} from '@tanstack/react-form';
import * as React from 'react';
import type { z } from 'zod';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * A thin TanStack Form integration that preserves the shadcn-style
 * Form/FormField/FormItem/FormLabel/FormControl/FormMessage API the codebase was
 * built around (formerly backed by react-hook-form). Call sites change minimally:
 * they keep `useAppForm({ schema, defaultValues })`, `<Form {...form}>`, and
 * `<FormField control={form.control} name=… render={({ field }) => …} />`.
 *
 * Field render props expose an RHF-shaped `field` object — `{ name, value,
 * onChange, onBlur, ref }` — adapted onto the TanStack field API. Values are
 * always defined (default '' / null upstream) so Base UI inputs/selects never
 * flip uncontrolled→controlled.
 */

type AnyForm = ReactFormExtendedApi<
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any
>;

/**
 * The RHF-compatible surface every call site relies on.
 *
 * `TValues` is the always-defined form-state shape (may be wider than the schema
 * input — e.g. `null` for an as-yet-unselected required enum). `TOut` is the
 * parsed/validated output handed to `handleSubmit`'s callback.
 */
export interface AppForm<TValues, TOut = TValues> {
	/** The underlying TanStack form instance (used by `FormField`). */
	tanstack: AnyForm;
	/** Kept for `control={form.control}` call sites; resolves to `tanstack`. */
	control: AnyForm;
	handleSubmit: (
		onValid: (values: TOut) => unknown,
	) => (event?: React.FormEvent) => void;
	reset: (values?: Partial<TValues>) => void;
	/**
	 * Reactively read a field's value (re-renders the caller on change).
	 * IMPORTANT: this is a React hook under the hood — call it once,
	 * unconditionally, at the top level of render. Never inside a loop,
	 * condition, or callback (e.g. an `.find()` predicate).
	 */
	watch: <K extends keyof TValues>(name: K) => TValues[K];
	getValues: () => TValues;
	setValue: <K extends keyof TValues>(name: K, value: TValues[K]) => void;
}

export function useAppForm<
	TSchema extends z.ZodType,
	TValues extends Record<string, unknown> = z.input<TSchema>,
>(opts: {
	schema: TSchema;
	defaultValues: TValues;
}): AppForm<TValues, z.output<TSchema>> {
	type TOut = z.output<TSchema>;

	// Keep a stable reference to the defaults so `reset()` (no args) restores them.
	const defaultsRef = React.useRef(opts.defaultValues);
	defaultsRef.current = opts.defaultValues;

	const tanstack = useForm({
		defaultValues: opts.defaultValues,
		// zod schemas implement the Standard Schema interface, which TanStack Form
		// accepts directly as a field/form validator.
		validators: { onSubmit: opts.schema as never },
	}) as unknown as AnyForm;

	return React.useMemo<AppForm<TValues, TOut>>(
		() => ({
			tanstack,
			control: tanstack,
			handleSubmit: (onValid) => (event) => {
				event?.preventDefault();
				event?.stopPropagation();
				void tanstack.handleSubmit().then(() => {
					if (tanstack.state.isValid) {
						onValid(tanstack.state.values as TOut);
					}
				});
			},
			reset: (values) => {
				tanstack.reset((values ?? defaultsRef.current) as TValues);
			},
			// Reactive: subscribe to the field's slice of the form store so consumers
			// re-render on change (e.g. a nature select that gates other fields). Safe
			// as a hidden hook because every call site invokes watch() exactly once,
			// unconditionally, at the top of its render.
			watch: ((name: string) =>
				useStore(
					tanstack.store,
					(s: { values: Record<string, unknown> }) => s.values[name],
				)) as never,
			getValues: () => tanstack.state.values as TValues,
			setValue: (name, value) => {
				tanstack.setFieldValue(name as never, value as never);
			},
		}),
		[tanstack],
	);
}

const FormContext = React.createContext<AnyForm | null>(null);

/**
 * Wraps a form. Spread the `useAppForm` result onto it (`<Form {...form}>`); the
 * provider reads the `tanstack` key.
 */
function Form({
	tanstack,
	children,
}: AppForm<any> & { children: React.ReactNode }) {
	return (
		<FormContext.Provider value={tanstack}>{children}</FormContext.Provider>
	);
}

type FormFieldContextValue = {
	name: string;
	error: string | undefined;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
	{} as FormFieldContextValue,
);

/** The RHF-shaped field object handed to `FormField`'s `render`. */
interface RenderField {
	name: string;
	value: any;
	onChange: (eventOrValue: any) => void;
	onBlur: () => void;
	ref: React.Ref<any>;
}

/** Reduces a TanStack field's error list to a single message string. */
function firstErrorMessage(errors: unknown): string | undefined {
	if (!Array.isArray(errors) || errors.length === 0) return undefined;
	const first = errors[0];
	if (first == null) return undefined;
	if (typeof first === 'string') return first;
	if (typeof first === 'object' && 'message' in first) {
		return String((first as { message: unknown }).message);
	}
	return String(first);
}

function FormField({
	control,
	name,
	render,
}: {
	// Accepted for call-site parity (`control={form.control}`); the field reads
	// the form from context, so this is only used as a fallback.
	control?: AnyForm;
	name: string;
	render: (props: { field: RenderField }) => React.ReactElement;
}) {
	const ctxForm = React.useContext(FormContext);
	const form = ctxForm ?? control;
	if (!form) {
		throw new Error('<FormField> must be used within a <Form>');
	}

	const FieldComponent = form.Field;

	return (
		<FieldComponent name={name}>
			{(fieldApi: AnyFieldApi) => {
				const field: RenderField = {
					name: fieldApi.name,
					value: fieldApi.state.value,
					onChange: (eventOrValue) => {
						const next =
							eventOrValue &&
							typeof eventOrValue === 'object' &&
							'target' in eventOrValue
								? (eventOrValue.target as HTMLInputElement).value
								: eventOrValue;
						fieldApi.handleChange(next);
					},
					onBlur: () => fieldApi.handleBlur(),
					ref: () => {},
				};
				const error = firstErrorMessage(fieldApi.state.meta.errors);
				return (
					<FormFieldContext.Provider value={{ name, error }}>
						{render({ field })}
					</FormFieldContext.Provider>
				);
			}}
		</FieldComponent>
	);
}

type FormItemContextValue = {
	id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
	{} as FormItemContextValue,
);

function useFormField() {
	const fieldContext = React.useContext(FormFieldContext);
	const itemContext = React.useContext(FormItemContext);

	const { id } = itemContext;

	return {
		id,
		name: fieldContext.name,
		formItemId: `${id}-form-item`,
		formDescriptionId: `${id}-form-item-description`,
		formMessageId: `${id}-form-item-message`,
		error: fieldContext.error,
	};
}

function FormItem({ className, ...props }: React.ComponentProps<'div'>) {
	const id = React.useId();

	return (
		<FormItemContext.Provider value={{ id }}>
			<div
				data-slot="form-item"
				className={cn('space-y-2', className)}
				{...props}
			/>
		</FormItemContext.Provider>
	);
}

function FormLabel({
	className,
	...props
}: React.ComponentProps<typeof Label>) {
	const { error, formItemId } = useFormField();

	return (
		<Label
			data-slot="form-label"
			data-error={!!error}
			className={cn('data-[error=true]:text-destructive', className)}
			htmlFor={formItemId}
			{...props}
		/>
	);
}

function FormControl({
	render,
	children,
	ref,
	...props
}: useRender.ComponentProps<'input'> & {
	children?: React.ReactElement;
}) {
	const { error, formItemId, formDescriptionId, formMessageId } =
		useFormField();

	return useRender({
		render: (render ?? children) as useRender.RenderProp,
		ref,
		props: {
			'data-slot': 'form-control',
			id: formItemId,
			'aria-describedby': !error
				? `${formDescriptionId}`
				: `${formDescriptionId} ${formMessageId}`,
			'aria-invalid': !!error,
			...props,
		},
	});
}

function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
	const { formDescriptionId } = useFormField();

	return (
		<p
			data-slot="form-description"
			id={formDescriptionId}
			className={cn('text-sm text-muted-foreground', className)}
			{...props}
		/>
	);
}

function FormMessage({
	className,
	children,
	...props
}: React.ComponentProps<'p'>) {
	const { error, formMessageId } = useFormField();
	const body = error ? String(error) : children;

	if (!body) {
		return null;
	}

	return (
		<p
			data-slot="form-message"
			id={formMessageId}
			className={cn('text-sm font-medium text-destructive', className)}
			{...props}
		>
			{body}
		</p>
	);
}

export type { DeepKeys };
export {
	useFormField,
	Form,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
	FormField,
};
