'use client';

import { useQuery } from '@tanstack/react-query';
import { Plus, Tags, Trash } from 'lucide-react';
import { FormEvent, useState } from 'react';

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

import type { BathroomType } from '@/generated/prisma/client';

import {
	useCreateBathroomType,
	useDeleteBathroomType,
} from './_data/mutations';
import { bathroomTypesQueryOptions } from './_data/queries';

/**
 * Manage the user's per-user bathroom type catalog. Mirrors the brands manager:
 * add a type, remove a type (the server blocks removing one still in use → 409,
 * surfaced as a toast by the mutation hook).
 */
export function BathroomTypeManagerDialog() {
	const [open, setOpen] = useState(false);
	const { data: types } = useQuery(bathroomTypesQueryOptions);
	const createType = useCreateBathroomType();
	const deleteType = useDeleteBathroomType();
	const [name, setName] = useState('');

	const onAdd = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		try {
			await createType.mutateAsync({ name: trimmed });
			setName('');
		} catch {
			// onError toast already shown.
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button variant="outline" size="icon" />}>
				<Tags />
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Bathroom types</DialogTitle>
					<DialogDescription>
						Your personal catalog of product types. Removing a type in use is
						blocked.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onAdd} className="flex items-end gap-2">
					<div className="flex flex-1 flex-col gap-1">
						<Label>New type</Label>
						<Input
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="e.g. Conditioner"
						/>
					</div>
					<Button type="submit" size="icon" loading={createType.isPending}>
						<Plus />
					</Button>
				</form>
				<div className="flex flex-col gap-1">
					{(types ?? []).map((type) => (
						<TypeRow
							key={type.id}
							type={type}
							onDelete={(value) => deleteType.mutate(value)}
							busy={deleteType.isPending}
						/>
					))}
					{types && types.length === 0 && (
						<p className="text-muted-foreground text-sm">No types yet.</p>
					)}
				</div>
				<DialogFooter>
					<Button variant="secondary" onClick={() => setOpen(false)}>
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function TypeRow({
	type,
	onDelete,
	busy,
}: {
	type: BathroomType;
	onDelete: (name: string) => void;
	busy: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5">
			<span className="truncate text-sm">{type.name}</span>
			<Button
				size="icon-sm"
				variant="ghost"
				disabled={busy}
				onClick={() => onDelete(type.name)}
				aria-label={`Delete ${type.name}`}
			>
				<Trash />
			</Button>
		</div>
	);
}
