'use client';

import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { Container } from '@/generated/prisma/client';
import { ContainerType } from '@/generated/prisma/enums';

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
import { MultiSelectCommand } from '@/components/ui/multi-select-command';

import { useCreateContainerProvision } from '../_data/mutations';

/** A catalog container with how many units are still free to add to this trip. */
type AvailableContainer = Container & { remaining: number };

/**
 * Add one or more of the user's containers to this trip in a single action. A
 * container is offered while the user still has free units of it; for a multi-owned
 * container you can pick how many to add, each becoming its own card.
 */
export function AddContainerDialog({
	tripId,
	containers,
}: {
	tripId: string;
	containers: AvailableContainer[];
}) {
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<string[]>([]);
	// Per-container chosen count (defaults to 1 when first selected).
	const [counts, setCounts] = useState<Record<string, number>>({});
	const create = useCreateContainerProvision(tripId);

	const byId = new Map(containers.map((c) => [c.id, c]));

	function onOpenChange(next: boolean) {
		setOpen(next);
		if (!next) {
			setSelected([]);
			setCounts({});
		}
	}

	function onValueChange(next: string[]) {
		setSelected(next);
		// Seed a default count of 1 for newly-selected containers.
		setCounts((prev) => {
			const out = { ...prev };
			for (const id of next) if (out[id] === undefined) out[id] = 1;
			return out;
		});
	}

	function setCount(id: string, delta: number) {
		const max = byId.get(id)?.remaining ?? 1;
		setCounts((prev) => ({
			...prev,
			[id]: Math.max(1, Math.min(max, (prev[id] ?? 1) + delta)),
		}));
	}

	const totalToAdd = selected.reduce((n, id) => n + (counts[id] ?? 1), 0);

	async function onAdd() {
		try {
			await Promise.all(
				selected.map((containerId) =>
					create.mutateAsync({ containerId, count: counts[containerId] ?? 1 }),
				),
			);
			toast.success(
				totalToAdd === 1
					? 'Container added to trip'
					: `${totalToAdd} containers added to trip`,
			);
			onOpenChange(false);
		} catch {
			// useCreateContainerProvision surfaces the error via a toast.
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger
				render={
					<Button
						variant="brand"
						size="sm"
						disabled={containers.length === 0}
					/>
				}
			>
				<Plus />
				Add container
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add containers</DialogTitle>
					<DialogDescription>
						Pick the bags and packing cubes you&rsquo;re bringing on this trip.
					</DialogDescription>
				</DialogHeader>
				<MultiSelectCommand
					groups={[
						{
							heading: 'Clothes containers',
							items: containers.filter((c) => c.type === ContainerType.Clothes),
						},
						{
							heading: 'Essentials containers',
							items: containers.filter(
								(c) => c.type === ContainerType.Essentials,
							),
						},
					]}
					getKey={(c) => c.id}
					getLabel={(c) => c.name}
					getImageKey={(c) => c.imageKey}
					value={selected}
					onValueChange={onValueChange}
					placeholder="Search your containers…"
					emptyText="No containers found."
					className="ring-foreground/10 rounded-lg ring-1"
				/>
				{selected.some((id) => (byId.get(id)?.remaining ?? 1) > 1) && (
					<div
						className="flex flex-col gap-1.5"
						data-testid="container-qty-steppers"
					>
						{selected
							.map((id) => byId.get(id))
							.filter((c): c is AvailableContainer => !!c && c.remaining > 1)
							.map((c) => (
								<div
									key={c.id}
									data-testid="container-qty"
									data-name={c.name}
									className="flex items-center gap-2 text-sm"
								>
									<span className="min-w-0 flex-1 truncate">{c.name}</span>
									<span className="text-muted-foreground text-xs">
										{c.remaining} owned free
									</span>
									<div className="flex items-center gap-1">
										<Button
											type="button"
											size="icon-xs"
											variant="ghost"
											aria-label={`Add one fewer ${c.name}`}
											disabled={(counts[c.id] ?? 1) <= 1}
											onClick={() => setCount(c.id, -1)}
										>
											<Minus />
										</Button>
										<span
											data-testid="container-qty-value"
											className="w-6 text-center text-sm font-semibold tabular-nums"
										>
											{counts[c.id] ?? 1}
										</span>
										<Button
											type="button"
											size="icon-xs"
											variant="ghost"
											aria-label={`Add one more ${c.name}`}
											disabled={(counts[c.id] ?? 1) >= c.remaining}
											onClick={() => setCount(c.id, 1)}
										>
											<Plus />
										</Button>
									</div>
								</div>
							))}
					</div>
				)}
				<DialogFooter>
					<Button
						type="button"
						variant="brand"
						loading={create.isPending}
						disabled={selected.length === 0}
						onClick={onAdd}
					>
						Add{totalToAdd > 0 ? ` ${totalToAdd}` : ''}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
