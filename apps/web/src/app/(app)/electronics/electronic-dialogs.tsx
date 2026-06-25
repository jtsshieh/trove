'use client';

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
	ImageOff,
	Link2,
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
	useId,
	useRef,
	useState,
	type ChangeEvent,
} from 'react';
import { toast } from 'sonner';

import { BrandDomain, ElectronicKind } from '@/generated/prisma/enums';

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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { uploadImageFile } from '@/lib/image-pipeline';
import { imageSrc } from '@/lib/images';

import type { ElectronicWithLinks } from './_data/api';
import { scanElectronicImage } from './_data/api';
import {
	useCreateElectronic,
	useCreateElectronicLink,
	useDeleteElectronic,
	useDeleteElectronicLink,
	useEditElectronic,
} from './_data/mutations';
import { brandsQueryOptions, electronicsQueryOptions } from './_data/queries';
import {
	createElectronicSchema,
	editElectronicSchema,
} from './_data/schemas';

const KIND_LABELS: Record<ElectronicKind, string> = {
	[ElectronicKind.Device]: 'Device',
	[ElectronicKind.Cable]: 'Cable',
	[ElectronicKind.PowerBank]: 'Power Bank',
	[ElectronicKind.Accessory]: 'Accessory',
};

/** Per-user brands tagged for the Electronics app (the shared Brand table spans apps). */
function useElectronicsBrandNames(): string[] {
	const { data: brands } = useQuery(brandsQueryOptions);
	return (brands ?? [])
		.filter((b) => b.domains.includes(BrandDomain.Electronics))
		.map((b) => b.name);
}

export function CreateElectronicDialog() {
	const [open, setOpen] = useState(false);
	const createElectronic = useCreateElectronic();
	const isPending = createElectronic.isPending;
	const brandNames = useElectronicsBrandNames();
	const form = useAppForm({
		schema: createElectronicSchema,
		defaultValues: {
			name: '',
			kind: null as ElectronicKind | null,
			brand: undefined as string | undefined,
			model: undefined as string | undefined,
			serialNumber: undefined as string | undefined,
			acquiredAt: null as Date | null,
			quantity: 1 as number | undefined,
			notes: undefined as string | undefined,
			imageKey: null as string | null | undefined,
		},
	});

	const onSubmit = form.handleSubmit(async (data) => {
		try {
			await createElectronic.mutateAsync(data);
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
				<span className="hidden sm:block">Add Electronic</span>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-5">
						<DialogHeader>
							<DialogTitle>Add electronic</DialogTitle>
						</DialogHeader>
						<ElectronicBody
							form={form}
							brandNames={brandNames}
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

export function EditElectronicDialog({
	electronic,
}: {
	electronic: ElectronicWithLinks;
}) {
	const [open, setOpen] = useState(false);
	const editElectronic = useEditElectronic();
	const isPending = editElectronic.isPending;
	const brandNames = useElectronicsBrandNames();
	const defaults = () => ({
		name: electronic.name,
		kind: electronic.kind as ElectronicKind | null,
		brand: electronic.brandName ?? undefined,
		model: electronic.model ?? undefined,
		serialNumber: electronic.serialNumber ?? undefined,
		acquiredAt: electronic.acquiredAt as Date | null,
		quantity: electronic.quantity as number | undefined,
		notes: electronic.notes ?? undefined,
		imageKey: electronic.imageKey as string | null | undefined,
	});
	const form = useAppForm({
		schema: editElectronicSchema,
		defaultValues: defaults(),
	});

	const onSubmit = form.handleSubmit(async (data) => {
		try {
			await editElectronic.mutateAsync({ id: electronic.id, input: data });
			setOpen(false);
		} catch {
			// onError toast already shown; keep the dialog open for a retry.
		}
	});

	useEffect(() => {
		form.reset(defaults());
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [electronic]);

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
			<DialogTrigger render={<Button variant="secondary" />}>Edit</DialogTrigger>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-5">
						<DialogHeader>
							<DialogTitle>Edit electronic</DialogTitle>
						</DialogHeader>
						<ElectronicBody
							form={form}
							brandNames={brandNames}
							disabled={isPending}
						/>
						<AssociatedItems electronic={electronic} disabled={isPending} />
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
 * The dialog body: a large photo on one side and the
 * kind/name/brand/model/serial/acquired/quantity/notes fields on the other.
 * Stacks to a single column on narrow screens.
 */
function ElectronicBody({
	form,
	brandNames,
	disabled,
	scan,
}: {
	form: AppForm<any>;
	brandNames: string[];
	disabled: boolean;
	scan?: boolean;
}) {
	return (
		<div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
			<PhotoField form={form} disabled={disabled} scan={scan} />
			<ElectronicFields
				form={form}
				brandNames={brandNames}
				disabled={disabled}
			/>
		</div>
	);
}

/**
 * Large photo upload field. Uploads immediately; the "Edit" step opens the image
 * editor (crop, erase anything, remove background). In create mode it also exposes a
 * "Scan a photo" button that fills the form from the image via the LLM.
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
			const res = await scanElectronicImage(imageKey);
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
			set('kind', suggestion.kind);
			set('brand', suggestion.brand);
			set('model', suggestion.model);
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

/** The shared kind/name/brand/model/serial/acquired/quantity/notes fields. */
function ElectronicFields({
	form,
	brandNames,
	disabled,
}: {
	form: AppForm<any>;
	brandNames: string[];
	disabled: boolean;
}) {
	const brandListId = useId();
	return (
		<div className="grid min-w-0 flex-1 grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
			<FormField
				control={form.control}
				name="kind"
				render={({ field }) => (
					<FormItem className="flex flex-col">
						<FormLabel>Kind</FormLabel>
						<Select
							value={field.value ?? null}
							onValueChange={field.onChange}
							disabled={disabled}
							// SelectItem values are enum keys (e.g. "PowerBank"); pass items
							// so the trigger renders the label ("Power Bank").
							items={Object.keys(ElectronicKind).map((kind) => ({
								value: kind,
								label: KIND_LABELS[kind as ElectronicKind],
							}))}
						>
							<FormControl>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select the kind" />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								{Object.keys(ElectronicKind).map((kind) => (
									<SelectItem key={kind} value={kind}>
										{KIND_LABELS[kind as ElectronicKind]}
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
						{/*
						 * Free-form text + a datalist of the user's Electronics-domain
						 * brands: pick an existing one or type a brand-new name (the server
						 * connect-or-creates it and tags it for this app on save).
						 */}
						<Input
							disabled={disabled}
							placeholder="e.g. Apple"
							list={brandListId}
							{...field}
							value={field.value ?? ''}
						/>
						<datalist id={brandListId}>
							{brandNames.map((brand) => (
								<option key={brand} value={brand} />
							))}
						</datalist>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="name"
				render={({ field }) => (
					<FormItem className="flex flex-col sm:col-span-2">
						<FormLabel>Name</FormLabel>
						<Input
							disabled={disabled}
							placeholder="Enter a name for this item"
							{...field}
							value={field.value ?? ''}
						/>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="model"
				render={({ field }) => (
					<FormItem className="flex flex-col">
						<FormLabel>Model</FormLabel>
						<Input
							disabled={disabled}
							placeholder="Optional model"
							{...field}
							value={field.value ?? ''}
						/>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="serialNumber"
				render={({ field }) => (
					<FormItem className="flex flex-col">
						<FormLabel>Serial number</FormLabel>
						<Input
							disabled={disabled}
							placeholder="Optional serial number"
							{...field}
							value={field.value ?? ''}
						/>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="acquiredAt"
				render={({ field }) => (
					<FormItem className="flex flex-col">
						<FormLabel>Acquired</FormLabel>
						<Input
							type="date"
							disabled={disabled}
							value={
								field.value ? format(field.value as Date, 'yyyy-MM-dd') : ''
							}
							onChange={(event) =>
								field.onChange(
									event.target.value
										? new Date(`${event.target.value}T00:00:00`)
										: null,
								)
							}
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
			<FormField
				control={form.control}
				name="notes"
				render={({ field }) => (
					<FormItem className="flex flex-col sm:col-span-2">
						<FormLabel>Notes</FormLabel>
						<Textarea
							disabled={disabled}
							placeholder="Optional notes"
							{...field}
							value={field.value ?? ''}
						/>
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	);
}

/**
 * "Associated items" — add/remove accessory links via a picker of the user's other
 * electronics. Links are persisted immediately (independent of the form submit), so
 * this only appears on an existing item (it needs the saved electronic's id).
 */
function AssociatedItems({
	electronic,
	disabled,
}: {
	electronic: ElectronicWithLinks;
	disabled: boolean;
}) {
	const { data: all } = useSuspenseQuery(electronicsQueryOptions);
	const createLink = useCreateElectronicLink();
	const deleteLink = useDeleteElectronicLink();
	const busy = createLink.isPending || deleteLink.isPending;
	const [pick, setPick] = useState<string>('');

	// Always read links/candidates from the live query (which the mutations
	// invalidate) so chips + the picker refresh immediately after a link change,
	// rather than from the dialog's stale `electronic` prop snapshot.
	const live = all.find((e) => e.id === electronic.id) ?? electronic;

	// The current item's links, in both directions, as {linkId, name}.
	const current = [
		...live.asDevice.map((l) => ({
			linkId: l.id,
			name: l.accessory.name,
		})),
		...live.asAccessory.map((l) => ({
			linkId: l.id,
			name: l.device.name,
		})),
	];
	const linkedIds = new Set([
		...live.asDevice.map((l) => l.accessoryId),
		...live.asAccessory.map((l) => l.deviceId),
	]);
	const candidates = all.filter(
		(e) => e.id !== electronic.id && !linkedIds.has(e.id),
	);

	async function add() {
		if (!pick) return;
		try {
			// This item is the device; the picked item is the accessory.
			await createLink.mutateAsync({
				deviceId: electronic.id,
				accessoryId: pick,
			});
			setPick('');
			toast.success('Linked');
		} catch {
			// onError toast (with the server's message) already shown by the hook.
		}
	}

	async function remove(linkId: string) {
		try {
			await deleteLink.mutateAsync(linkId);
			toast.success('Unlinked');
		} catch {
			// onError toast already shown by the hook.
		}
	}

	return (
		<div className="flex flex-col gap-2 border-t pt-4">
			<FormLabel>Associated items</FormLabel>
			<p className="text-muted-foreground text-xs">
				Link accessories to this item (an iPad and its Apple Pencil). Changes
				save immediately.
			</p>
			{current.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{current.map((c) => (
						<span
							key={c.linkId}
							className="bg-brand-subtle text-brand inline-flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2 text-xs font-medium"
						>
							<Link2 className="size-3" />
							{c.name}
							<button
								type="button"
								onClick={() => remove(c.linkId)}
								disabled={busy || disabled}
								aria-label={`Unlink ${c.name}`}
								className="hover:bg-brand/10 rounded-full p-0.5"
							>
								<X className="size-3" />
							</button>
						</span>
					))}
				</div>
			)}
			<div className="flex gap-2">
				<Select
					value={pick || null}
					onValueChange={(value) => setPick(value ?? '')}
					disabled={disabled}
					// SelectItem values are ids (CUIDs); pass items so the trigger renders
					// the item's name instead of the raw id.
					items={candidates.map((c) => ({ value: c.id, label: c.name }))}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Pick an item to link" />
					</SelectTrigger>
					<SelectContent>
						{candidates.map((c) => (
							<SelectItem key={c.id} value={c.id}>
								{c.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button
					type="button"
					variant="outline"
					onClick={add}
					loading={busy}
					disabled={!pick || disabled}
				>
					<Plus /> Link
				</Button>
			</div>
		</div>
	);
}

export function DeleteElectronicDialog({
	electronic,
}: {
	electronic: ElectronicWithLinks;
}) {
	const [open, setOpen] = useState(false);
	const deleteElectronic = useDeleteElectronic();
	const isPending = deleteElectronic.isPending;
	const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		try {
			await deleteElectronic.mutateAsync(electronic.id);
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
					<DialogTitle>Delete electronic</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete {electronic.name}? This action is
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
