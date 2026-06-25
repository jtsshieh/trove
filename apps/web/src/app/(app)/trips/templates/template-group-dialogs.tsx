'use client';

import { Plus, Trash } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MultiSelectGroup } from '@/components/ui/multi-select-command';
import { MultiSelectGallery } from '@/components/ui/multi-select-gallery';
import { EssentialKind } from '@/generated/prisma/enums';

import {
	pickKey,
	type EssentialItemCatalog,
	type EssentialItemPickOption,
} from '../[tripId]/_data/essential-catalog';
import { resolveEssentialItem } from '../[tripId]/_data/essential-item';
import type { EssentialGroupWithItems } from './_data/api';
import {
	useCreateEssentialGroup,
	useDeleteEssentialGroup,
	useEditEssentialGroup,
} from './_data/mutations';

const APP_LABELS: Record<EssentialKind, string> = {
	[EssentialKind.Bathroom]: 'Bathroom',
	[EssentialKind.Document]: 'Documents',
	[EssentialKind.Electronic]: 'Electronics',
};

/** The catalog as the `groups` prop for the gallery — one heading per app. */
function useCatalogGroups(catalog: EssentialItemCatalog) {
	return useMemo<MultiSelectGroup<EssentialItemPickOption>[]>(
		() => [
			{ heading: APP_LABELS[EssentialKind.Bathroom], items: catalog.bathroom },
			{ heading: APP_LABELS[EssentialKind.Document], items: catalog.document },
			{
				heading: APP_LABELS[EssentialKind.Electronic],
				items: catalog.electronic,
			},
		],
		[catalog],
	);
}

/** Flat key → pick lookup so selected keys resolve back to (kind, itemId). */
function useCatalogByKey(catalog: EssentialItemCatalog) {
	return useMemo(() => {
		const map = new Map<string, EssentialItemPickOption>();
		for (const opt of [
			...catalog.bathroom,
			...catalog.electronic,
			...catalog.document,
		])
			map.set(opt.key, opt);
		return map;
	}, [catalog]);
}

function keysToPicks(
	keys: string[],
	byKey: Map<string, EssentialItemPickOption>,
) {
	return keys
		.map((key) => byKey.get(key))
		.filter((opt): opt is EssentialItemPickOption => opt !== undefined)
		.map((opt) => ({ kind: opt.kind, itemId: opt.itemId }));
}

export function CreateTemplateGroupDialog({
	catalog,
}: {
	catalog: EssentialItemCatalog;
}) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState('');
	const [selected, setSelected] = useState<string[]>([]);
	const createGroup = useCreateEssentialGroup();
	const isPending = createGroup.isPending;
	const groups = useCatalogGroups(catalog);
	const byKey = useCatalogByKey(catalog);

	function reset() {
		setName('');
		setSelected([]);
	}

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		try {
			await createGroup.mutateAsync({
				name: name.trim(),
				items: keysToPicks(selected, byKey),
			});
			toast.success('Template created');
			reset();
			setOpen(false);
		} catch {
			// onError toast already shown; keep the dialog open for a retry.
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(newOpen) => {
				if (!newOpen) reset();
				setOpen(newOpen);
			}}
		>
			<DialogTrigger
				render={
					<Button size="icon" className="gap-1 sm:w-auto sm:px-4 sm:py-2" />
				}
			>
				<Plus />
				<span className="hidden sm:block">Create template</span>
			</DialogTrigger>
			<DialogContent
				className="flex max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-3xl"
				render={<form onSubmit={onSubmit} />}
			>
				<DialogHeader>
					<DialogTitle>Create template</DialogTitle>
					<DialogDescription>
						Bundle bathroom, electronics, and document items you always pack
						together.
					</DialogDescription>
				</DialogHeader>
				<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden sm:flex-row">
					<div className="flex shrink-0 flex-col gap-4 sm:w-60">
						<div className="flex flex-col gap-2">
							<Label htmlFor="template-name">Name</Label>
							<Input
								id="template-name"
								value={name}
								disabled={isPending}
								placeholder="Enter a name for this template"
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<Label>Items</Label>
							<p className="text-muted-foreground text-xs">
								Pick any mix of bathroom, electronics, and documents.
							</p>
						</div>
					</div>
					<div className="flex min-h-0 flex-1 flex-col">
						<MultiSelectGallery
							groups={groups}
							getKey={(o) => o.key}
							getLabel={(o) => o.name}
							getImageKey={(o) => o.imageKey}
							value={selected}
							onValueChange={setSelected}
							placeholder="Search items…"
							emptyText="No items found."
							className="flex-1"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button
						type="submit"
						loading={isPending}
						disabled={!name.trim() || selected.length === 0}
					>
						Create template
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function EditTemplateGroupDialog({
	group,
	catalog,
}: {
	group: EssentialGroupWithItems;
	catalog: EssentialItemCatalog;
}) {
	const initialKeys = useMemo(
		() =>
			group.items.map((item) => {
				const { kind, itemId } = resolveEssentialItem(item);
				return pickKey(kind, itemId);
			}),
		[group.items],
	);

	const [open, setOpen] = useState(false);
	const [name, setName] = useState(group.name);
	const [selected, setSelected] = useState<string[]>(initialKeys);
	const editGroup = useEditEssentialGroup();
	const isPending = editGroup.isPending;
	const groups = useCatalogGroups(catalog);
	const byKey = useCatalogByKey(catalog);

	function resetToGroup() {
		setName(group.name);
		setSelected(initialKeys);
	}

	useEffect(() => {
		setName(group.name);
		setSelected(initialKeys);
	}, [group.name, initialKeys]);

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		try {
			await editGroup.mutateAsync({
				id: group.id,
				input: { name: name.trim(), items: keysToPicks(selected, byKey) },
			});
			toast.success('Template updated');
			setOpen(false);
		} catch {
			// onError toast already shown; keep the dialog open for a retry.
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(newOpen) => {
				if (!newOpen) resetToGroup();
				setOpen(newOpen);
			}}
		>
			<DialogTrigger render={<Button variant="secondary" />}>Edit</DialogTrigger>
			<DialogContent
				className="flex max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-3xl"
				render={<form onSubmit={onSubmit} />}
			>
				<DialogHeader>
					<DialogTitle>Edit template</DialogTitle>
				</DialogHeader>
				<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden sm:flex-row">
					<div className="flex shrink-0 flex-col gap-4 sm:w-60">
						<div className="flex flex-col gap-2">
							<Label htmlFor={`template-name-${group.id}`}>Name</Label>
							<Input
								id={`template-name-${group.id}`}
								value={name}
								disabled={isPending}
								placeholder="Enter a name for this template"
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<Label>Items</Label>
							<p className="text-muted-foreground text-xs">
								Pick any mix of bathroom, electronics, and documents.
							</p>
						</div>
					</div>
					<div className="flex min-h-0 flex-1 flex-col">
						<MultiSelectGallery
							groups={groups}
							getKey={(o) => o.key}
							getLabel={(o) => o.name}
							getImageKey={(o) => o.imageKey}
							value={selected}
							onValueChange={setSelected}
							placeholder="Search items…"
							emptyText="No items found."
							className="flex-1"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button
						type="submit"
						loading={isPending}
						disabled={!name.trim() || selected.length === 0}
					>
						Save changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function DeleteTemplateGroupDialog({
	group,
}: {
	group: EssentialGroupWithItems;
}) {
	const [open, setOpen] = useState(false);
	const deleteGroup = useDeleteEssentialGroup();
	const isPending = deleteGroup.isPending;

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		try {
			await deleteGroup.mutateAsync(group.id);
			toast.success('Template deleted');
			setOpen(false);
		} catch {
			// onError toast already shown; keep the dialog open for a retry.
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button size="icon" variant="destructive" />}>
				<Trash />
			</DialogTrigger>
			<DialogContent render={<form onSubmit={onSubmit} />}>
				<DialogHeader>
					<DialogTitle>Delete template</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete {group.name}? This action is
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
