'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Plus, Trash } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { Essential } from '@/generated/prisma/client';
import { EssentialCategory } from '@/generated/prisma/enums';

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

import {
	useCreateEssentialGroup,
	useDeleteEssentialGroup,
	useEditEssentialGroup,
} from './_data/mutations';
import { essentialsQueryOptions } from './_data/queries';
import type { EssentialGroupWithItems } from './essential-groups-list';

const CATEGORY_LABELS: Record<EssentialCategory, string> = {
	[EssentialCategory.Toiletry]: 'Toiletries',
	[EssentialCategory.Document]: 'Documents',
	[EssentialCategory.Electronic]: 'Electronics',
};

/**
 * A group holds one type of item: once something is selected, disable every
 * essential of a different category so the selection stays single-category.
 */
function useSingleCategoryLock(essentials: Essential[], selected: string[]) {
	return useMemo<Set<string>>(() => {
		if (selected.length === 0) return new Set();
		const lockedCategory = essentials.find(
			(e) => e.id === selected[0],
		)?.category;
		if (!lockedCategory) return new Set();
		return new Set(
			essentials.filter((e) => e.category !== lockedCategory).map((e) => e.id),
		);
	}, [essentials, selected]);
}

/** Group the essentials by category for the MultiSelectCommand `groups` prop. */
function useEssentialGroups(essentials: Essential[]) {
	return useMemo<MultiSelectGroup<Essential>[]>(() => {
		const order: EssentialCategory[] = [
			EssentialCategory.Toiletry,
			EssentialCategory.Document,
			EssentialCategory.Electronic,
		];
		return order.map((category) => ({
			heading: CATEGORY_LABELS[category],
			items: essentials.filter((e) => e.category === category),
		}));
	}, [essentials]);
}

export function CreateEssentialGroupDialog({
	essentials,
}: {
	essentials?: Essential[];
}) {
	const { data: queried } = useSuspenseQuery(essentialsQueryOptions);
	const allEssentials = essentials ?? queried;

	const [open, setOpen] = useState(false);
	const [name, setName] = useState('');
	const [selected, setSelected] = useState<string[]>([]);
	const createEssentialGroup = useCreateEssentialGroup();
	const isPending = createEssentialGroup.isPending;
	const groups = useEssentialGroups(allEssentials);
	const lockedKeys = useSingleCategoryLock(allEssentials, selected);

	function reset() {
		setName('');
		setSelected([]);
	}

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		try {
			await createEssentialGroup.mutateAsync({
				name: name.trim(),
				essentialIds: selected,
			});
			toast.success('Group created');
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
				<span className="hidden sm:block">Create group</span>
			</DialogTrigger>
			<DialogContent className="flex max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-3xl" render={<form onSubmit={onSubmit} />}>
				<DialogHeader>
					<DialogTitle>Create group</DialogTitle>
					<DialogDescription>
						Bundle essentials you always pack together.
					</DialogDescription>
				</DialogHeader>
				<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden sm:flex-row">
					<div className="flex shrink-0 flex-col gap-4 sm:w-60">
						<div className="flex flex-col gap-2">
							<Label htmlFor="group-name">Name</Label>
							<Input
								id="group-name"
								value={name}
								disabled={isPending}
								placeholder="Enter a name for this group"
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<Label>Essentials</Label>
							<p className="text-muted-foreground text-xs">
								A group holds one type. Pick a category and it locks to it.
							</p>
						</div>
					</div>
					<div className="flex min-h-0 flex-1 flex-col">
						<MultiSelectGallery
							groups={groups}
							getKey={(e) => e.id}
							getLabel={(e) => e.name}
							getImageKey={(e) => e.imageKey}
							value={selected}
							onValueChange={setSelected}
							disabledKeys={lockedKeys}
							placeholder="Search essentials…"
							emptyText="No essentials found."
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
						Create group
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function EditEssentialGroupDialog({
	group,
	essentials,
}: {
	group: EssentialGroupWithItems;
	essentials: Essential[];
}) {
	const initialIds = useMemo(
		() => group.items.map((i) => i.essentialId),
		[group.items],
	);

	const [open, setOpen] = useState(false);
	const [name, setName] = useState(group.name);
	const [selected, setSelected] = useState<string[]>(initialIds);
	const editEssentialGroup = useEditEssentialGroup();
	const isPending = editEssentialGroup.isPending;
	const groups = useEssentialGroups(essentials);
	const lockedKeys = useSingleCategoryLock(essentials, selected);

	function resetToGroup() {
		setName(group.name);
		setSelected(initialIds);
	}

	useEffect(() => {
		setName(group.name);
		setSelected(initialIds);
	}, [group.name, initialIds]);

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		try {
			await editEssentialGroup.mutateAsync({
				id: group.id,
				input: { name: name.trim(), essentialIds: selected },
			});
			toast.success('Group updated');
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
			<DialogContent className="flex max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-3xl" render={<form onSubmit={onSubmit} />}>
				<DialogHeader>
					<DialogTitle>Edit group</DialogTitle>
				</DialogHeader>
				<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden sm:flex-row">
					<div className="flex shrink-0 flex-col gap-4 sm:w-60">
						<div className="flex flex-col gap-2">
							<Label htmlFor={`group-name-${group.id}`}>Name</Label>
							<Input
								id={`group-name-${group.id}`}
								value={name}
								disabled={isPending}
								placeholder="Enter a name for this group"
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-1">
							<Label>Essentials</Label>
							<p className="text-muted-foreground text-xs">
								A group holds one type. Pick a category and it locks to it.
							</p>
						</div>
					</div>
					<div className="flex min-h-0 flex-1 flex-col">
						<MultiSelectGallery
							groups={groups}
							getKey={(e) => e.id}
							getLabel={(e) => e.name}
							getImageKey={(e) => e.imageKey}
							value={selected}
							onValueChange={setSelected}
							disabledKeys={lockedKeys}
							placeholder="Search essentials…"
							emptyText="No essentials found."
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

export function DeleteEssentialGroupDialog({
	group,
}: {
	group: EssentialGroupWithItems;
}) {
	const [open, setOpen] = useState(false);
	const deleteEssentialGroup = useDeleteEssentialGroup();
	const isPending = deleteEssentialGroup.isPending;

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		try {
			await deleteEssentialGroup.mutateAsync(group.id);
			toast.success('Group deleted');
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
					<DialogTitle>Delete group</DialogTitle>
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
