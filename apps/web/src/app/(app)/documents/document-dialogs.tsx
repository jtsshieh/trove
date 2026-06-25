'use client';

import type { Document } from '@/generated/prisma/client';
import { Pencil, Plus, ScanLine, Trash } from 'lucide-react';
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
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	useAppForm,
	type AppForm,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { uploadImageFile } from '@/lib/image-pipeline';

import { scanDocumentImage } from './_data/api';
import {
	useCreateDocument,
	useDeleteDocument,
	useEditDocument,
} from './_data/mutations';
import { createDocumentSchema, editDocumentSchema } from './_data/schemas';

/**
 * "Scan a photo" button for the name-only document form. Photographing a document
 * uploads it (only so the model can read it — the key is NOT stored on the Document),
 * scans it for a generic name, and fills the name input. Best-effort: a failed read
 * just leaves the field for manual entry.
 */
function ScanDocumentButton({
	form,
	disabled,
}: {
	form: AppForm<any>;
	disabled?: boolean;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [scanning, setScanning] = useState(false);

	async function onSelect(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		setScanning(true);
		try {
			// The photo is uploaded only to be read by the model; it is never persisted
			// on the document, so we discard the returned key after scanning.
			const imageKey = await uploadImageFile(file);
			const res = await scanDocumentImage(imageKey);
			const name = res.suggestion?.name;
			if (typeof name === 'string' && name.trim() !== '') {
				form.setValue('name' as never, name as never);
				toast.success('Scanned. Check the name.');
			} else {
				toast.error("Couldn't read that photo. Type the name manually.");
			}
		} catch {
			toast.error('Scan failed');
		} finally {
			setScanning(false);
		}
	}

	return (
		<>
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				capture="environment"
				className="hidden"
				onChange={onSelect}
				data-testid="document-scan-input"
			/>
			<Button
				type="button"
				variant="outline"
				size="sm"
				loading={scanning}
				disabled={disabled}
				onClick={() => inputRef.current?.click()}
				data-testid="document-scan"
			>
				<ScanLine /> Scan a photo
			</Button>
		</>
	);
}

export function CreateDocumentDialog() {
	const [open, setOpen] = useState(false);
	const createDocument = useCreateDocument();
	const isPending = createDocument.isPending;
	const form = useAppForm({
		schema: createDocumentSchema,
		defaultValues: { name: '' },
	});

	const onSubmit = form.handleSubmit(async (data) => {
		try {
			await createDocument.mutateAsync(data);
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
				<span className="hidden sm:block">Add Document</span>
			</DialogTrigger>
			<DialogContent>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-8">
						<DialogHeader>
							<DialogTitle>Add document</DialogTitle>
							<DialogDescription>
								Type a name, or scan a photo of the document to fill it in.
							</DialogDescription>
						</DialogHeader>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<div className="flex items-center justify-between gap-2">
										<FormLabel>Name</FormLabel>
										<ScanDocumentButton form={form} disabled={isPending} />
									</div>
									<Input
										disabled={isPending}
										placeholder="Enter a name for this document"
										{...field}
										value={field.value ?? ''}
									/>
									<FormMessage />
								</FormItem>
							)}
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

export function EditDocumentDialog({ document }: { document: Document }) {
	const [open, setOpen] = useState(false);
	const editDocument = useEditDocument();
	const isPending = editDocument.isPending;
	const form = useAppForm({
		schema: editDocumentSchema,
		defaultValues: {
			name: document.name,
		},
	});

	const onSubmit = form.handleSubmit(async (data) => {
		try {
			await editDocument.mutateAsync({ id: document.id, input: data });
			setOpen(false);
		} catch {
			// onError toast already shown; keep the dialog open for a retry.
		}
	});

	// Keep the prefilled value in sync with the latest document, but never while the
	// dialog is open — a background refetch must not clobber an in-progress rename.
	useEffect(() => {
		if (open) return;
		form.reset({
			name: document.name,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [document, open]);

	return (
		<Dialog
			open={open}
			onOpenChange={(newOpen) => {
				if (!newOpen) {
					form.reset({
						name: document.name,
					});
					setOpen(false);
				} else {
					setOpen(true);
				}
			}}
		>
			<DialogTrigger render={<Button size="icon" variant="secondary" />}>
				<Pencil />
			</DialogTrigger>
			<DialogContent>
				<Form {...form}>
					<form onSubmit={onSubmit} className="space-y-8">
						<DialogHeader>
							<DialogTitle>Edit document</DialogTitle>
						</DialogHeader>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem className="flex flex-col">
									<FormLabel>Name</FormLabel>
									<Input
										disabled={isPending}
										placeholder="Enter a name for this document"
										{...field}
										value={field.value ?? ''}
									/>
									<FormMessage />
								</FormItem>
							)}
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

export function DeleteDocumentDialog({ document }: { document: Document }) {
	const [open, setOpen] = useState(false);
	const deleteDocument = useDeleteDocument();
	const isPending = deleteDocument.isPending;
	const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		try {
			await deleteDocument.mutateAsync(document.id);
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
					<DialogTitle>Delete document</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete {document.name}? This action is
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
