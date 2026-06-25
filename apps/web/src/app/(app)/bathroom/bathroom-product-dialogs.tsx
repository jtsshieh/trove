'use client';

import { useQuery } from '@tanstack/react-query';
import {
	ImageOff,
	Loader2,
	Pencil,
	Plus,
	ScanLine,
	Trash,
	Upload,
	X,
} from 'lucide-react';
import {
	FormEvent,
	useEffect,
	useId,
	useRef,
	useState,
	type ChangeEvent,
} from 'react';
import { toast } from 'sonner';

import { BathroomForm, BathroomNature } from '@/generated/prisma/enums';

import { ImageEditorDialog } from '@/components/image-editor-dialog';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	useAppForm,
	type AppForm,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { brandsQueryOptions } from '@/app/(app)/closet/clothing/brands/_data/queries';
import { uploadImageFile } from '@/lib/image-pipeline';
import { imageSrc } from '@/lib/images';
import {
	formatVolume,
	parseVolumeInput,
	type VolumeUnitKey,
} from '@/lib/units';

import type {
	BathroomProductWithVariants,
	BathroomVariantWithStock,
} from './_data/api';
import { scanBathroomImage } from './_data/api';
import {
	useAddBathroomVariant,
	useCreateBathroomProduct,
	useDeleteBathroomProduct,
	useDeleteBathroomVariant,
	useEditBathroomProduct,
	useEditBathroomVariant,
} from './_data/mutations';
import { bathroomTypesQueryOptions } from './_data/queries';
import {
	createBathroomProductSchema,
	editBathroomProductSchema,
} from './_data/schemas';

interface VariantDraft {
	label: string;
	capacityMl: number | null;
}

export function CreateBathroomProductDialog() {
	const [open, setOpen] = useState(false);
	const createProduct = useCreateBathroomProduct();
	const isPending = createProduct.isPending;
	const [variants, setVariants] = useState<VariantDraft[]>([
		{ label: '', capacityMl: null },
	]);
	const form = useAppForm({
		schema: createBathroomProductSchema,
		defaultValues: {
			name: '',
			nature: null as BathroomNature | null,
			form: null as BathroomForm | null,
			notes: '',
			type: '',
			brand: '',
			imageKey: null,
			variants: [],
		},
	});

	const reset = () => {
		form.reset();
		setVariants([{ label: '', capacityMl: null }]);
	};

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const values = form.getValues();
		if (!values.nature) {
			toast.error('Pick a nature');
			return;
		}
		// Only consumables carry a volume; for the rest a variant is just a label.
		const hasVolume = values.nature === 'Consumable';
		const cleaned = variants
			.map((v) => ({
				label: v.label.trim() || null,
				capacityMl: hasVolume ? v.capacityMl : null,
			}))
			// A product needs at least one variant; drop fully-empty trailing rows.
			.filter((v, i) => i === 0 || v.label || v.capacityMl != null);
		try {
			await createProduct.mutateAsync({
				name: values.name,
				nature: values.nature,
				form: values.nature === 'Consumable' ? values.form : null,
				notes: values.notes || null,
				type: values.type || null,
				brand: values.brand || null,
				imageKey: values.imageKey,
				variants: cleaned,
			});
			reset();
			setOpen(false);
		} catch {
			// onError toast already shown; keep the dialog open for a retry.
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) reset();
				setOpen(next);
			}}
		>
			<DialogTrigger
				render={
					<Button size="icon" className="gap-1 sm:w-auto sm:px-4 sm:py-2" />
				}
			>
				<Plus />
				<span className="hidden sm:block">Add product</span>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-5">
						<DialogHeader>
							<DialogTitle>Add bathroom product</DialogTitle>
						</DialogHeader>
						<ProductBody
							form={form}
							disabled={isPending}
							variants={variants}
							setVariants={setVariants}
							scan
						/>
						<DialogFooter>
							<Button type="submit" loading={isPending}>
								Save changes
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

export function EditBathroomProductDialog({
	product,
}: {
	product: BathroomProductWithVariants;
}) {
	const [open, setOpen] = useState(false);
	const editProduct = useEditBathroomProduct();
	const isPending = editProduct.isPending;
	const form = useAppForm({
		schema: editBathroomProductSchema,
		defaultValues: {
			name: product.name,
			nature: product.nature as BathroomNature | null,
			form: product.form as BathroomForm | null,
			notes: product.notes ?? '',
			type: product.typeName ?? '',
			brand: product.brandName ?? '',
			imageKey: product.imageKey,
		},
	});

	useEffect(() => {
		form.reset({
			name: product.name,
			nature: product.nature,
			form: product.form,
			notes: product.notes ?? '',
			type: product.typeName ?? '',
			brand: product.brandName ?? '',
			imageKey: product.imageKey,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		product.name,
		product.nature,
		product.form,
		product.notes,
		product.typeName,
		product.brandName,
		product.imageKey,
	]);

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const values = form.getValues();
		try {
			await editProduct.mutateAsync({
				id: product.id,
				input: {
					name: values.name,
					nature: values.nature ?? undefined,
					form: values.nature === 'Consumable' ? values.form : null,
					notes: values.notes || null,
					type: values.type || null,
					brand: values.brand || null,
					imageKey: values.imageKey,
				},
			});
			setOpen(false);
		} catch {
			// onError toast already shown; keep the dialog open for a retry.
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button variant="secondary" size="sm" />}>
				Edit
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-5">
						<DialogHeader>
							<DialogTitle>Edit bathroom product</DialogTitle>
							<DialogDescription>
								Add, rename, or remove variants from the product card.
							</DialogDescription>
						</DialogHeader>
						<ProductBody form={form} disabled={isPending} />
						<DialogFooter>
							<Button type="submit" loading={isPending}>
								Save changes
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

function ProductBody({
	form,
	disabled,
	variants,
	setVariants,
	scan,
}: {
	form: AppForm<any>;
	disabled: boolean;
	variants?: VariantDraft[];
	setVariants?: (next: VariantDraft[]) => void;
	scan?: boolean;
}) {
	const nature = form.watch('nature') as BathroomNature | null;
	return (
		<div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
			<PhotoField form={form} disabled={disabled} scan={scan} />
			<div className="flex min-w-0 flex-1 flex-col gap-4">
				<NatureField form={form} disabled={disabled} />
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem className="flex flex-col">
							<FormLabel>Name</FormLabel>
							<Input
								disabled={disabled}
								placeholder="e.g. Daily shampoo"
								{...field}
							/>
							<FormMessage />
						</FormItem>
					)}
				/>
				{nature === 'Consumable' && (
					<FormField
						control={form.control}
						name="form"
						render={({ field }) => (
							<FormItem className="flex flex-col">
								<FormLabel>Form</FormLabel>
								<Select
									value={field.value ?? null}
									onValueChange={field.onChange}
									disabled={disabled}
									items={Object.keys(BathroomForm).map((value) => ({
										value,
										label: value,
									}))}
								>
									<FormControl>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Liquid, gel, powder…" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{Object.keys(BathroomForm).map((value) => (
											<SelectItem key={value} value={value}>
												{value}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}
				<TypeField form={form} disabled={disabled} />
				<BrandField form={form} disabled={disabled} />
				<FormField
					control={form.control}
					name="notes"
					render={({ field }) => (
						<FormItem className="flex flex-col">
							<FormLabel>Notes</FormLabel>
							<Textarea
								disabled={disabled}
								placeholder="Anything worth remembering"
								{...field}
								value={field.value ?? ''}
							/>
							<FormMessage />
						</FormItem>
					)}
				/>
				{variants && setVariants && (
					<VariantEditor
						variants={variants}
						setVariants={setVariants}
						disabled={disabled}
						// Only consumables have a measurable volume; appliances and
						// launderables treat a variant as just a label/size.
						showVolume={nature === 'Consumable'}
					/>
				)}
			</div>
		</div>
	);
}

function NatureField({
	form,
	disabled,
}: {
	form: AppForm<any>;
	disabled: boolean;
}) {
	return (
		<FormField
			control={form.control}
			name="nature"
			render={({ field }) => (
				<FormItem className="flex flex-col">
					<FormLabel>Nature</FormLabel>
					<Select
						value={field.value ?? null}
						onValueChange={field.onChange}
						disabled={disabled}
						items={Object.keys(BathroomNature).map((value) => ({
							value,
							label: value,
						}))}
					>
						<FormControl>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Consumable, appliance, or launderable" />
							</SelectTrigger>
						</FormControl>
						<SelectContent>
							{Object.keys(BathroomNature).map((value) => (
								<SelectItem key={value} value={value}>
									{value}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}

/** Free-form per-user type, backed by a datalist of the user's existing types. */
function TypeField({
	form,
	disabled,
}: {
	form: AppForm<any>;
	disabled: boolean;
}) {
	const listId = useId();
	const { data: types } = useQuery(bathroomTypesQueryOptions);
	return (
		<FormField
			control={form.control}
			name="type"
			render={({ field }) => (
				<FormItem className="flex flex-col">
					<FormLabel>Type</FormLabel>
					<Input
						disabled={disabled}
						placeholder="e.g. Shampoo"
						list={listId}
						{...field}
						value={field.value ?? ''}
					/>
					<datalist id={listId}>
						{types?.map((type) => (
							<option key={type.id} value={type.name} />
						))}
					</datalist>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}

/** Free-form per-user brand, datalist filtered to brands in the Bathroom domain. */
function BrandField({
	form,
	disabled,
}: {
	form: AppForm<any>;
	disabled: boolean;
}) {
	const listId = useId();
	const { data: brands } = useQuery(brandsQueryOptions);
	const bathroomBrands = (brands ?? []).filter((brand) =>
		brand.domains.includes('Bathroom'),
	);
	return (
		<FormField
			control={form.control}
			name="brand"
			render={({ field }) => (
				<FormItem className="flex flex-col">
					<FormLabel>Brand</FormLabel>
					<Input
						disabled={disabled}
						placeholder="e.g. Aesop"
						list={listId}
						{...field}
						value={field.value ?? ''}
					/>
					<datalist id={listId}>
						{bathroomBrands.map((brand) => (
							<option key={brand.id} value={brand.name} />
						))}
					</datalist>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}

/** Repeatable variant editor: each row is a label + a mL/oz volume field. */
function VariantEditor({
	variants,
	setVariants,
	disabled,
	showVolume,
}: {
	variants: VariantDraft[];
	setVariants: (next: VariantDraft[]) => void;
	disabled: boolean;
	showVolume: boolean;
}) {
	const update = (index: number, patch: Partial<VariantDraft>) => {
		setVariants(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
	};

	return (
		<div className="flex flex-col gap-2">
			<Label>Variants</Label>
			<div className="flex flex-col gap-2">
				{variants.map((variant, index) => (
					<div
						key={index}
						className="flex items-end gap-2 rounded-lg border p-2"
					>
						<div className="flex flex-1 flex-col gap-1">
							<Label className="text-xs">Label</Label>
							<Input
								disabled={disabled}
								placeholder="e.g. Travel size"
								value={variant.label}
								onChange={(event) =>
									update(index, { label: event.target.value })
								}
							/>
						</div>
						{showVolume && (
							<VolumeField
								value={variant.capacityMl}
								disabled={disabled}
								onChange={(ml) => update(index, { capacityMl: ml })}
							/>
						)}
						{variants.length > 1 && (
							<Button
								type="button"
								size="icon"
								variant="ghost"
								disabled={disabled}
								onClick={() =>
									setVariants(variants.filter((_, i) => i !== index))
								}
								aria-label="Remove variant"
							>
								<X />
							</Button>
						)}
					</div>
				))}
			</div>
			<Button
				type="button"
				size="sm"
				variant="outline"
				disabled={disabled}
				onClick={() =>
					setVariants([...variants, { label: '', capacityMl: null }])
				}
			>
				<Plus /> Add variant
			</Button>
		</div>
	);
}

/**
 * A capacity input with a mL/oz unit toggle. The canonical value is always stored as
 * milliliters (via `parseVolumeInput`); switching units re-renders the same canonical
 * value formatted for the chosen unit, so toggling never loses precision.
 */
function VolumeField({
	value,
	disabled,
	onChange,
}: {
	value: number | null;
	disabled: boolean;
	onChange: (ml: number | null) => void;
}) {
	const [unit, setUnit] = useState<VolumeUnitKey>('Milliliters');
	const [raw, setRaw] = useState('');

	// Reflect the canonical mL into the displayed field for the active unit.
	useEffect(() => {
		if (value == null) {
			setRaw('');
			return;
		}
		setRaw(formatVolume(value, unit).replace(/ (mL|fl oz)$/, ''));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [unit, value]);

	return (
		<div className="flex w-44 flex-col gap-1">
			<Label className="text-xs">Capacity</Label>
			<div className="flex gap-1">
				<Input
					type="number"
					min={0}
					step="any"
					disabled={disabled}
					placeholder="Size"
					value={raw}
					onChange={(event) => {
						setRaw(event.target.value);
						onChange(
							event.target.value === ''
								? null
								: parseVolumeInput(event.target.value, unit),
						);
					}}
				/>
				<Select
					value={unit}
					onValueChange={(next) => next && setUnit(next as VolumeUnitKey)}
					disabled={disabled}
					// SelectItem values are the canonical unit keys but the labels are the
					// short "mL"/"fl oz" — pass `items` so the trigger shows the label, not
					// the raw key.
					items={[
						{ value: 'Milliliters', label: 'mL' },
						{ value: 'FluidOunces', label: 'fl oz' },
					]}
				>
					<SelectTrigger className="w-24 shrink-0">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="Milliliters">mL</SelectItem>
						<SelectItem value="FluidOunces">fl oz</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}

/**
 * Large photo upload field. Uploads immediately; the "Edit" step opens the image
 * editor (crop, erase, remove background). Mirrors the essentials PhotoField.
 */
function PhotoField({
	form,
	disabled,
	scan,
}: {
	form: AppForm<any>;
	disabled: boolean;
	scan?: boolean;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [file, setFile] = useState<File | null>(null);
	const [busy, setBusy] = useState(false);
	const [editing, setEditing] = useState(false);
	const [scanning, setScanning] = useState(false);
	const imageKey = form.watch('imageKey') as string | null | undefined;

	async function uploadFile(toUpload: File, onSet: (key: string) => void) {
		setBusy(true);
		try {
			onSet(await uploadImageFile(toUpload));
		} catch {
			toast.error('Upload failed');
		} finally {
			setBusy(false);
		}
	}

	// Read the current photo via the LLM and prefill the form. Setting `nature`
	// reactively reveals the Form + Volume fields (handled by ProductBody's watch).
	async function onScan() {
		if (!imageKey) return;
		setScanning(true);
		try {
			const res = await scanBathroomImage(imageKey);
			const suggestion = res.suggestion as
				| Record<string, unknown>
				| null
				| undefined;
			if (!suggestion) {
				toast.error("Couldn't read that photo. Fill it in manually.");
				return;
			}
			const set = (name: string, value: unknown) => {
				if (value !== undefined && value !== null && value !== '') {
					form.setValue(name as never, value as never);
				}
			};
			set('name', suggestion.name);
			set('nature', suggestion.nature);
			set('form', suggestion.form);
			set('type', suggestion.type);
			set('brand', suggestion.brand);
			toast.success('Scanned. Check the details.');
		} catch {
			toast.error('Scan failed');
		} finally {
			setScanning(false);
		}
	}

	return (
		<FormField
			control={form.control}
			name="imageKey"
			render={({ field }) => {
				function onSelect(event: ChangeEvent<HTMLInputElement>) {
					const selected = event.target.files?.[0];
					if (!selected) return;
					setFile(selected);
					void uploadFile(selected, (key) => field.onChange(key));
					event.target.value = '';
				}

				const canEdit = !!file || !!field.value;

				return (
					<FormItem className="flex flex-col gap-2 sm:w-56 sm:shrink-0">
						<FormLabel>Photo</FormLabel>
						<FormControl>
							<div className="flex flex-col gap-3">
								<div className="bg-muted text-muted-foreground relative aspect-square w-full overflow-hidden rounded-xl border">
									<button
										type="button"
										onClick={() => canEdit && setEditing(true)}
										disabled={!canEdit || busy || disabled}
										aria-label={canEdit ? 'Edit photo' : undefined}
										className="group block size-full"
									>
										{field.value ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img
												src={imageSrc(field.value)}
												alt=""
												className="size-full object-cover"
											/>
										) : (
											<div className="flex size-full flex-col items-center justify-center gap-2">
												<ImageOff className="size-8 opacity-40" />
												<span className="text-xs">No photo yet</span>
											</div>
										)}
									</button>
									{busy && (
										<div className="bg-background/60 absolute inset-0 grid place-content-center">
											<Loader2 className="size-6 animate-spin" />
										</div>
									)}
									{field.value && !busy && (
										<Button
											type="button"
											size="icon-sm"
											variant="secondary"
											className="absolute top-2 right-2 z-10"
											onClick={() => {
												field.onChange(null);
												setFile(null);
											}}
											disabled={disabled}
											aria-label="Remove photo"
										>
											<X />
										</Button>
									)}
								</div>
								<input
									ref={inputRef}
									type="file"
									accept="image/*"
									capture="environment"
									className="hidden"
									onChange={onSelect}
								/>
								<div className="flex flex-wrap gap-1.5">
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() => inputRef.current?.click()}
										disabled={busy || disabled}
									>
										<Upload /> {field.value ? 'Replace' : 'Add photo'}
									</Button>
									<Button
										type="button"
										size="sm"
										variant="ghost"
										onClick={() => setEditing(true)}
										disabled={!canEdit || busy || disabled}
										title="Crop, erase, or remove the background"
									>
										<Pencil /> Edit
									</Button>
								</div>
								{scan && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="w-full"
										loading={scanning}
										disabled={!field.value || disabled || busy}
										onClick={onScan}
									>
										<ScanLine /> Scan a photo
									</Button>
								)}
								<ImageEditorDialog
									open={editing}
									onOpenChange={setEditing}
									file={file}
									src={!file && field.value ? imageSrc(field.value) : null}
									onApply={(edited) => {
										setFile(edited);
										void uploadFile(edited, (key) => field.onChange(key));
									}}
								/>
							</div>
						</FormControl>
						<FormMessage />
					</FormItem>
				);
			}}
		/>
	);
}

export function DeleteBathroomProductDialog({
	product,
}: {
	product: BathroomProductWithVariants;
}) {
	const [open, setOpen] = useState(false);
	const deleteProduct = useDeleteBathroomProduct();
	const isPending = deleteProduct.isPending;
	const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		try {
			await deleteProduct.mutateAsync(product.id);
			setOpen(false);
		} catch {
			// onError toast already shown; keep the dialog open for a retry.
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button size="icon" variant="destructive" />}>
				<Trash />
			</DialogTrigger>
			<DialogContent render={<form onSubmit={onSubmit} />}>
				<DialogHeader>
					<DialogTitle>Delete product</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete {product.name}? This removes its
						variants, batches, and units. This action is irreversible.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						onClick={(e) => {
							e.preventDefault();
							setOpen(false);
						}}
						variant="secondary"
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button type="submit" loading={isPending}>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/**
 * Shared body for the add/edit variant dialogs: a label and — for consumables only —
 * a capacity field. Appliances and launderables have no measurable volume, so the
 * capacity input is hidden (a variant there is purely a label/size).
 */
function VariantFields({
	label,
	setLabel,
	capacityMl,
	setCapacityMl,
	showVolume,
	disabled,
}: {
	label: string;
	setLabel: (next: string) => void;
	capacityMl: number | null;
	setCapacityMl: (next: number | null) => void;
	showVolume: boolean;
	disabled: boolean;
}) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<Label>Label</Label>
				<Input
					disabled={disabled}
					placeholder="e.g. Travel size"
					value={label}
					onChange={(event) => setLabel(event.target.value)}
				/>
			</div>
			{showVolume && (
				<VolumeField
					value={capacityMl}
					disabled={disabled}
					onChange={setCapacityMl}
				/>
			)}
		</div>
	);
}

export function AddBathroomVariantDialog({
	product,
}: {
	product: BathroomProductWithVariants;
}) {
	const [open, setOpen] = useState(false);
	const [label, setLabel] = useState('');
	const [capacityMl, setCapacityMl] = useState<number | null>(null);
	const addVariant = useAddBathroomVariant();
	const showVolume = product.nature === 'Consumable';

	const reset = () => {
		setLabel('');
		setCapacityMl(null);
	};

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			await addVariant.mutateAsync({
				productId: product.id,
				input: {
					label: label.trim() || null,
					capacityMl: showVolume ? capacityMl : null,
				},
			});
			reset();
			setOpen(false);
		} catch {
			// onError toast already shown; keep the dialog open for a retry.
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) reset();
				setOpen(next);
			}}
		>
			<DialogTrigger render={<Button size="sm" variant="outline" />}>
				<Plus /> Add variant
			</DialogTrigger>
			<DialogContent render={<form onSubmit={onSubmit} />}>
				<DialogHeader>
					<DialogTitle>Add variant</DialogTitle>
					<DialogDescription>
						A new variation of {product.name}.
					</DialogDescription>
				</DialogHeader>
				<VariantFields
					label={label}
					setLabel={setLabel}
					capacityMl={capacityMl}
					setCapacityMl={setCapacityMl}
					showVolume={showVolume}
					disabled={addVariant.isPending}
				/>
				<DialogFooter>
					<Button type="submit" loading={addVariant.isPending}>
						Add variant
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function EditBathroomVariantDialog({
	product,
	variant,
}: {
	product: BathroomProductWithVariants;
	variant: BathroomVariantWithStock;
}) {
	const [open, setOpen] = useState(false);
	const [label, setLabel] = useState(variant.label ?? '');
	const [capacityMl, setCapacityMl] = useState<number | null>(
		variant.capacityMl,
	);
	const editVariant = useEditBathroomVariant();
	const showVolume = product.nature === 'Consumable';

	// Re-seed from the variant whenever the dialog (re)opens.
	useEffect(() => {
		if (open) {
			setLabel(variant.label ?? '');
			setCapacityMl(variant.capacityMl);
		}
	}, [open, variant.label, variant.capacityMl]);

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			await editVariant.mutateAsync({
				id: variant.id,
				input: {
					label: label.trim() || null,
					capacityMl: showVolume ? capacityMl : null,
				},
			});
			setOpen(false);
		} catch {
			// onError toast already shown; keep the dialog open for a retry.
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button size="icon-sm" variant="ghost" aria-label="Edit variant" />
				}
			>
				<Pencil />
			</DialogTrigger>
			<DialogContent render={<form onSubmit={onSubmit} />}>
				<DialogHeader>
					<DialogTitle>Edit variant</DialogTitle>
				</DialogHeader>
				<VariantFields
					label={label}
					setLabel={setLabel}
					capacityMl={capacityMl}
					setCapacityMl={setCapacityMl}
					showVolume={showVolume}
					disabled={editVariant.isPending}
				/>
				<DialogFooter>
					<Button type="submit" loading={editVariant.isPending}>
						Save changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function DeleteBathroomVariantDialog({
	variant,
	label,
}: {
	variant: BathroomVariantWithStock;
	label: string;
}) {
	const [open, setOpen] = useState(false);
	const deleteVariant = useDeleteBathroomVariant();
	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			await deleteVariant.mutateAsync(variant.id);
			setOpen(false);
		} catch {
			// onError toast already shown; keep the dialog open for a retry.
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button size="icon-sm" variant="ghost" aria-label="Delete variant" />
				}
			>
				<Trash />
			</DialogTrigger>
			<DialogContent render={<form onSubmit={onSubmit} />}>
				<DialogHeader>
					<DialogTitle>Delete variant</DialogTitle>
					<DialogDescription>
						Delete {label}? This removes its batches and units. This action is
						irreversible.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						onClick={(event) => {
							event.preventDefault();
							setOpen(false);
						}}
						variant="secondary"
						disabled={deleteVariant.isPending}
					>
						Cancel
					</Button>
					<Button type="submit" loading={deleteVariant.isPending}>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
