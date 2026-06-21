'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

import type { OutfitWithItems } from '../_data/fetchers';
import { useDeleteOutfit } from '../_data/mutations';

/** Confirm before deleting a template. Days already assigned keep their snapshot. */
export function DeleteOutfitDialog({
	open,
	onOpenChange,
	outfit,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	outfit: OutfitWithItems;
}) {
	const deleteOutfit = useDeleteOutfit();

	async function confirm() {
		try {
			await deleteOutfit.mutateAsync(outfit.id);
			onOpenChange(false);
		} catch {
			/* onError toast already shown */
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete outfit</DialogTitle>
					<DialogDescription>
						Delete{' '}
						<span className="text-foreground font-medium">{outfit.name}</span>?
						Days you already assigned it keep their pieces. Only the template
						is removed.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="outline"
						disabled={deleteOutfit.isPending}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						loading={deleteOutfit.isPending}
						onClick={confirm}
					>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
