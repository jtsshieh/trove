'use client';

import type { Essential } from '@/generated/prisma/client';
import { EssentialCategory } from '@/generated/prisma/enums';
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
import { uploadImageFile } from '@/lib/image-pipeline';
import { imageSrc } from '@/lib/images';
import { scanEssentialImage } from './_data/api';
import {
	useCreateEssential,
	useDeleteEssential,
	useEditEssential,
} from './_data/mutations';
import { createEssentialSchema, editEssentialSchema } from './_data/schemas';

export function CreateEssentialDialog() {
	const [open, setOpen] = useState(false);
	const createEssential = useCreateEssential();
	const isPending = createEssential.isPending;
	const form = useAppForm({
		schema: createEssentialSchema,
		defaultValues: {
			name: '',
			category: null as EssentialCategory | null,
			quantity: 1 as number | undefined,
			imageKey: null,
		},
	});

	const onSubmit = form.handleSubmit(async (data) => {
		try {
			await createEssential.mutateAsync(data);
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
				<span className="hidden sm:block">Add Essential</span>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-5">
						<DialogHeader>
							<DialogTitle>Add essential</DialogTitle>
						</DialogHeader>
						<EssentialBody form={form} disabled={isPending} scan />
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

export function EditEssentialDialog({ essential }: { essential: Essential }) {
	const [open, setOpen] = useState(false);
	const editEssential = useEditEssential();
	const isPending = editEssential.isPending;
	const form = useAppForm({
		schema: editEssentialSchema,
		defaultValues: {
			name: essential.name,
			category: essential.category as EssentialCategory | null,
			quantity: essential.quantity as number | undefined,
			imageKey: essential.imageKey,
		},
	});

	const onSubmit = form.handleSubmit(async (data) => {
		try {
			await editEssential.mutateAsync({ id: essential.id, input: data });
			setOpen(false);
		} catch {
			// onError toast already shown; keep the dialog open for a retry.
		}
	});

	useEffect(() => {
		form.reset({
			name: essential.name,
			category: essential.category,
			quantity: essential.quantity,
			imageKey: essential.imageKey,
		});
	}, [
		essential.name,
		essential.category,
		essential.quantity,
		essential.imageKey,
	]);
	return (
		<Dialog
			open={open}
			onOpenChange={(newOpen) => {
				if (!newOpen) {
					form.reset({
						name: essential.name,
						category: essential.category,
						quantity: essential.quantity,
						imageKey: essential.imageKey,
					});
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
							<DialogTitle>Edit essential</DialogTitle>
						</DialogHeader>
						<EssentialBody form={form} disabled={isPending} />
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
 * category/name/quantity fields on the other. Stacks to a single column on
 * narrow screens.
 */
function EssentialBody({
	form,
	disabled,
	scan,
}: {
	form: AppForm<any>;
	disabled: boolean;
	scan?: boolean;
}) {
	return (
		<div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
			<PhotoField form={form} disabled={disabled} scan={scan} />
			<EssentialFields form={form} disabled={disabled} />
		</div>
	);
}

/**
 * Large photo upload field. Uploads immediately; the "Edit" step opens the image
 * editor (crop, erase anything, remove background). In create mode it also
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
			const res = await scanEssentialImage(imageKey);
			const suggestion = res.suggestion as
				| Record<string, unknown>
				| null
				| undefined;
			if (!suggestion) {
				toast.error("Couldn't read that photo. Fill it in manually.");
				return;
			}
			if (typeof suggestion.name === 'string' && suggestion.name) {
				form.setValue('name', suggestion.name);
			}
			if (
				typeof suggestion.category === 'string' &&
				suggestion.category in EssentialCategory
			) {
				form.setValue('category', suggestion.category as EssentialCategory);
			}
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

/** The shared category/name/quantity fields. */
function EssentialFields({
	form,
	disabled,
}: {
	form: AppForm<any>;
	disabled: boolean;
}) {
	return (
		<div className="flex min-w-0 flex-1 flex-col gap-4">
			<FormField
				control={form.control}
				name="category"
				render={({ field }) => (
					<FormItem className="flex flex-col">
						<FormLabel>Category</FormLabel>
						<Select
							value={field.value ?? null}
							onValueChange={field.onChange}
							disabled={disabled}
						>
							<FormControl>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select the type of essential" />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								{Object.keys(EssentialCategory).map((type) => (
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
				name="name"
				render={({ field }) => (
					<FormItem className="flex flex-col">
						<FormLabel>Name</FormLabel>
						<Input
							disabled={disabled}
							placeholder="Enter a name for this essential"
							{...field}
						/>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="quantity"
				render={({ field }) => (
					<FormItem className="flex flex-col">
						<FormLabel>Quantity</FormLabel>
						<Input
							type="number"
							min={1}
							disabled={disabled}
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
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	);
}

export function DeleteEssentialDialog({ essential }: { essential: Essential }) {
	const [open, setOpen] = useState(false);
	const deleteEssential = useDeleteEssential();
	const isPending = deleteEssential.isPending;
	const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		try {
			await deleteEssential.mutateAsync(essential.id);
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
					<DialogTitle>Delete essential</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete {essential.name}? This action is
						irreversible.
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
