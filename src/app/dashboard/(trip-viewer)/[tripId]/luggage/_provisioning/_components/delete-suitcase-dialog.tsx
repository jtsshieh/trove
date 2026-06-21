'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';

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

import { useDeleteLuggageProvision } from '../_data/mutations';

/**
 * Removes a suitcase from this trip. Any containers inside it fall back into the
 * unassigned pool (the service nulls their luggage link), so nothing is lost.
 */
export function DeleteSuitcaseDialog({
	tripId,
	luggageProvisionId,
	name,
}: {
	tripId: string;
	luggageProvisionId: string;
	name: string;
}) {
	const [open, setOpen] = useState(false);
	const deleteProvision = useDeleteLuggageProvision(tripId);
	const isPending = deleteProvision.isPending;

	function onDelete() {
		void (async () => {
			try {
				await deleteProvision.mutateAsync(luggageProvisionId);
				setOpen(false);
			} catch {
				// The mutation hook surfaces the error toast.
			}
		})();
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={`Remove ${name} from trip`}
					/>
				}
			>
				<Trash2 />
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Remove {name}?</DialogTitle>
					<DialogDescription>
						This takes {name} off the trip and returns its containers to the
						unassigned pool. The suitcase itself is not deleted.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="secondary"
						onClick={() => setOpen(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button variant="destructive" onClick={onDelete} loading={isPending}>
						Remove
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
