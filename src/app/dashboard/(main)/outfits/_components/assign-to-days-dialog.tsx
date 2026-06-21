'use client';

import type { Trip } from '@/generated/prisma/client';
import { format, isWithinInterval, startOfDay } from 'date-fns';
import { CalendarPlus, Luggage } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAssignOutfitToDays } from '@/app/dashboard/(trip-viewer)/[tripId]/clothing/_data/mutations';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

import type { OutfitWithItems } from '../_data/fetchers';

interface AssignToDaysDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	outfit: OutfitWithItems;
	trips: Trip[];
}

/**
 * Materialize a template onto trip days: pick a trip, then the days within its
 * range. The assign action lives under [tripId], so the trip choice supplies it.
 */
export function AssignToDaysDialog({
	open,
	onOpenChange,
	outfit,
	trips,
}: AssignToDaysDialogProps) {
	const assignToDays = useAssignOutfitToDays();
	const pending = assignToDays.isPending;
	const [tripId, setTripId] = useState<string>(trips[0]?.id ?? '');
	const [days, setDays] = useState<Date[]>([]);

	// Reset selection each time the dialog opens.
	useEffect(() => {
		if (!open) return;
		setTripId(trips[0]?.id ?? '');
		setDays([]);
	}, [open, trips]);

	const trip = useMemo(
		() => trips.find((candidate) => candidate.id === tripId),
		[trips, tripId],
	);

	async function assign() {
		if (!trip || days.length === 0) return;
		try {
			await assignToDays.mutateAsync({
				tripId: trip.id,
				input: { outfitId: outfit.id, days },
			});
			toast.success(
				`Added to ${days.length} day${days.length > 1 ? 's' : ''} of ${trip.name}`,
			);
			onOpenChange(false);
		} catch {
			// onError toast already fired.
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add to a trip</DialogTitle>
					<DialogDescription>
						Drop{' '}
						<span className="text-foreground font-medium">{outfit.name}</span>{' '}
						onto the days you want to wear it.
					</DialogDescription>
				</DialogHeader>

				{trips.length === 0 ? (
					<EmptyState
						icon={<Luggage />}
						title="No trips yet"
						description="Create a trip first, then you can assign this outfit to its days."
					/>
				) : (
					<div className="flex flex-col gap-4">
						<div className="space-y-1.5">
							<span className="text-sm font-medium">Trip</span>
							<Select
								value={tripId}
								onValueChange={(value) => {
									setTripId(value as string);
									setDays([]);
								}}
								disabled={pending}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Choose a trip" />
								</SelectTrigger>
								<SelectContent>
									{trips.map((candidate) => (
										<SelectItem key={candidate.id} value={candidate.id}>
											{candidate.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{trip && (
							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">Days</span>
									<span className="text-muted-foreground text-xs">
										{format(trip.start, 'LLL d')} –{' '}
										{format(trip.end, 'LLL d, y')}
									</span>
								</div>
								<div className="bg-card flex justify-center rounded-lg border p-1">
									<Calendar
										mode="multiple"
										selected={days}
										onSelect={(next) => setDays(next ?? [])}
										defaultMonth={trip.start}
										startMonth={trip.start}
										endMonth={trip.end}
										disabled={(date) =>
											!isWithinInterval(startOfDay(date), {
												start: startOfDay(trip.start),
												end: startOfDay(trip.end),
											})
										}
									/>
								</div>
							</div>
						)}
					</div>
				)}

				<DialogFooter>
					<Button
						variant="outline"
						disabled={pending}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						variant="brand"
						loading={pending}
						disabled={!trip || days.length === 0}
						onClick={assign}
					>
						<CalendarPlus />
						Add to{' '}
						{days.length > 0
							? `${days.length} day${days.length > 1 ? 's' : ''}`
							: 'days'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
