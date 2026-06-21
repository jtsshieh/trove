'use client';

import { Plus } from 'lucide-react';
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

/**
 * Add one or more of the user's containers to this trip in a single action. Only
 * containers not already on the trip are offered; each pick fans out to the
 * existing createContainerProvision action.
 */
export function AddContainerDialog({
	tripId,
	containers,
}: {
	tripId: string;
	containers: Container[];
}) {
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<string[]>([]);
	const create = useCreateContainerProvision(tripId);

	function onOpenChange(next: boolean) {
		setOpen(next);
		if (!next) setSelected([]);
	}

	async function onAdd() {
		try {
			await Promise.all(
				selected.map((containerId) => create.mutateAsync({ containerId })),
			);
			toast.success(
				selected.length === 1
					? 'Container added to trip'
					: `${selected.length} containers added to trip`,
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
					onValueChange={setSelected}
					placeholder="Search your containers…"
					emptyText="No containers found."
					className="ring-foreground/10 rounded-lg ring-1"
				/>
				<DialogFooter>
					<Button
						type="button"
						variant="brand"
						loading={create.isPending}
						disabled={selected.length === 0}
						onClick={onAdd}
					>
						Add{selected.length > 0 ? ` ${selected.length}` : ''}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
