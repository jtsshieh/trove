'use client';

import type { Brand, Clothing, ClothingType } from '@/generated/prisma/client';
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
import React, {
	FormEvent,
	useEffect,
	useRef,
	useState,
	type ChangeEvent,
} from 'react';
import { toast } from 'sonner';

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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { ImageEditorDialog } from '@/components/image-editor-dialog';
import { generateClothingName } from '@/lib/generate-clothing-name';
import { uploadImageFile } from '@/lib/image-pipeline';
import { imageSrc } from '@/lib/images';
import { scanClothingImage } from './_data/api';
import {
	useCreateClothing,
	useDeleteClothing,
	useEditClothing,
} from './_data/mutations';
import { createClothingSchema, editClothingSchema } from './_data/schemas';
import { colors } from './constants';

/**
 * Renders a <SelectItem> for the current value when it isn't part of the known
 * list — lets a freshly scanned (and not-yet-saved) brand/type show as selected.
 */
function options(known: string[], current?: string) {
	if (current && !known.includes(current)) return [current, ...known];
	return known;
}

export function CreateClothingDialog({
	brands,
	types,
}: CreateClothingDialogProps) {
	const [open, setOpen] = useState(false);
	const createClothing = useCreateClothing();
	const isPending = createClothing.isPending;
	const form = useAppForm({
		schema: createClothingSchema,
		defaultValues: {
			type: null as string | null,
			typeCategory: undefined as 'Top' | 'Bottom' | 'Accessory' | undefined,
			brand: null as string | null,
			color: null as string | null,
			brandLine: undefined as string | undefined,
			modifier: undefined as string | undefined,
			quantity: 1 as number | undefined,
			imageKey: null as string | null | undefined,
		},
	});

	const onSubmit = form.handleSubmit(async (data) => {
		try {
			await createClothing.mutateAsync(data);
			form.reset();
			setOpen(false);
		} catch {
			// onError toast already shown; keep the dialog open for a retry.
		}
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(newOpen) => {
				if (!newOpen) {
					form.reset();
					setOpen(false);
				} else {
					setOpen(true);
				}
			}}
		>
			<DialogTrigger
				render={
					<Button size="icon" className="gap-1 sm:w-auto sm:px-4 sm:py-2" />
				}
			>
				<Plus />
				<span className="hidden sm:block">Add Clothing</span>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-5">
						<DialogHeader>
							<DialogTitle>Create clothing</DialogTitle>
						</DialogHeader>
						<ClothingBody
							form={form}
							brands={brands}
							types={types}
							disabled={isPending}
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

interface CreateClothingDialogProps {
	brands: Brand[];
	types: ClothingType[];
}

export function EditClothingDialog({
	clothing,
	brands,
	types,
}: {
	clothing: Clothing;
	brands: Brand[];
	types: ClothingType[];
}) {
	const [open, setOpen] = useState(false);
	const editClothing = useEditClothing();
	const isPending = editClothing.isPending;
	const defaults = () => ({
		brandLine: clothing.brandLine ?? undefined,
		color: clothing.color as string | null,
		modifier: clothing.modifier ?? undefined,
		quantity: clothing.quantity as number | undefined,
		imageKey: clothing.imageKey as string | null | undefined,
		typeCategory: undefined as 'Top' | 'Bottom' | 'Accessory' | undefined,

		type: clothing.typeName as string | null,
		brand: clothing.brandName as string | null,
	});
	const form = useAppForm({
		schema: editClothingSchema,
		defaultValues: defaults(),
	});

	const onSubmit = form.handleSubmit(async (data) => {
		try {
			await editClothing.mutateAsync({ id: clothing.id, input: data });
			setOpen(false);
		} catch {
			// onError toast already shown; keep the dialog open for a retry.
		}
	});

	useEffect(() => {
		form.reset(defaults());
	}, [clothing]);
	return (
		<Dialog
			open={open}
			onOpenChange={(newOpen) => {
				if (!newOpen) {
					form.reset(defaults());
					setOpen(false);
				} else {
					setOpen(true);
				}
			}}
		>
			<DialogTrigger render={<Button variant="secondary" />}>
				Edit
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-5">
						<DialogHeader>
							<DialogTitle>Edit clothing</DialogTitle>
						</DialogHeader>
						<ClothingBody
							form={form}
							brands={brands}
							types={types}
							disabled={isPending}
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

/**
 * The redesigned dialog body: a large photo on one side and the
 * type/brand/color/brandLine/modifier/quantity fields in a compact
 * 2-column grid on the other. Stacks to a single column on narrow screens.
 */
function ClothingBody({
	form,
	brands,
	types,
	disabled,
	scan,
}: {
	form: AppForm<any>;
	brands: Brand[];
	types: ClothingType[];
	disabled: boolean;
	scan?: boolean;
}) {
	return (
		<div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
			<PhotoField form={form} disabled={disabled} scan={scan} />
			<ClothingFields
				form={form}
				brands={brands}
				types={types}
				disabled={disabled}
			/>
		</div>
	);
}

/**
 * Large photo upload field. Uploads immediately; the "Edit" step opens the image
 * editor (crop, erase a hanger/anything, remove background). In create mode it also
 * exposes a "Scan a photo" button that fills the form from the image via the LLM.
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

	async function uploadFile(toUpload: File, onChange: (key: string) => void) {
		setBusy(true);
		try {
			onChange(await uploadImageFile(toUpload));
		} catch {
			toast.error('Upload failed');
		} finally {
			setBusy(false);
		}
	}

	async function onScan() {
		if (!imageKey) return;
		setScanning(true);
		try {
			const res = await scanClothingImage(imageKey);
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
			set('type', suggestion.type);
			set('typeCategory', suggestion.typeCategory);
			set('brand', suggestion.brand);
			set('color', suggestion.color);
			set('brandLine', suggestion.brandLine);
			set('modifier', suggestion.modifier);
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
								<div className="relative aspect-square w-full overflow-hidden rounded-xl border bg-muted text-muted-foreground">
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
										{canEdit && !busy && (
											<div className="absolute inset-0 grid place-content-center bg-background/0 text-foreground/0 transition-colors group-hover:bg-background/40 group-hover:text-foreground">
												<Pencil className="size-6" />
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
										title="Crop, erase a hanger, or remove the background"
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

/** The shared type/brand/color/brandLine/modifier/quantity fields. */
function ClothingFields({
	form,
	brands,
	types,
	disabled,
}: {
	form: AppForm<any>;
	brands: Brand[];
	types: ClothingType[];
	disabled: boolean;
}) {
	const typeNames = types.map((t) => t.name);
	const brandNames = brands.map((b) => b.name);
	return (
		<div className="grid min-w-0 flex-1 grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
			<FormField
				control={form.control}
				name="type"
				render={({ field }) => (
					<FormItem className="flex flex-col">
						<FormLabel>Type</FormLabel>
						<Select
							value={field.value ?? null}
							onValueChange={field.onChange}
							disabled={disabled}
						>
							<FormControl>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select the type of clothing" />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								{options(typeNames, field.value).map((type) => (
									<SelectItem key={type} value={type}>
										{type}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="brand"
				render={({ field }) => (
					<FormItem className="flex flex-col">
						<FormLabel>Brand</FormLabel>
						<Select
							value={field.value ?? null}
							onValueChange={field.onChange}
							disabled={disabled}
						>
							<FormControl>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select the brand of clothing" />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								{options(brandNames, field.value).map((brand) => (
									<SelectItem key={brand} value={brand}>
										{brand}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="color"
				render={({ field }) => (
					<FormItem className="flex flex-col">
						<FormLabel>Color</FormLabel>
						<Select
							value={field.value ?? null}
							onValueChange={field.onChange}
							disabled={disabled}
						>
							<FormControl>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select the color of clothing" />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								{options(colors, field.value).map((color) => (
									<SelectItem key={color} value={color}>
										{color}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="brandLine"
				render={({ field }) => (
					<FormItem className="flex flex-col">
						<FormLabel>Brand Line</FormLabel>
						<Input
							disabled={disabled}
							placeholder="Optional brand line"
							{...field}
							value={field.value ?? ''}
						/>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="modifier"
				render={({ field }) => (
					<FormItem className="flex flex-col">
						<FormLabel>Modifier</FormLabel>
						<Input
							disabled={disabled}
							placeholder="Optional modifier"
							{...field}
							value={field.value ?? ''}
						/>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="quantity"
				render={({ field }) => (
					<FormItem className="flex flex-col sm:col-span-2">
						<FormLabel>Quantity</FormLabel>
						<Input
							type="number"
							min={1}
							disabled={disabled}
							data-testid="quantity-input"
							placeholder="How many identical units you own"
							{...field}
							value={field.value ?? ''}
							onChange={(event) =>
								field.onChange(
									event.target.value === ''
										? undefined
										: Math.max(1, Math.trunc(+event.target.value)),
								)
							}
						/>
						<p className="text-muted-foreground text-xs">
							Shown as a stack in your wardrobe; each drag still places a single
							unit.
						</p>
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	);
}

export function DeleteClothingDialog({ clothing }: { clothing: Clothing }) {
	const [open, setOpen] = useState(false);
	const deleteClothing = useDeleteClothing();
	const isPending = deleteClothing.isPending;
	const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		try {
			await deleteClothing.mutateAsync(clothing.id);
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
					<DialogTitle>Delete clothing</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete {generateClothingName(clothing)}?
						This action is irreversible.
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
