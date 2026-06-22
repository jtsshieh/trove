'use client';

import type { Trip } from '@/generated/prisma/client';

import {
	BaseCreateEditTripForm,
	DeleteTripDialog,
} from '@/app/(app)/trip-planner/trip-dialogs';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';

export function ManageTrip({ trip }: { trip: Trip }) {
	return (
		<div className="flex flex-col gap-4">
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-xl">Trip Details</CardTitle>
					<CardDescription>
						Edit the details of your trip here. Keep in mind that changing the
						trip dates may cause any provisions you have created to be deleted.
					</CardDescription>
				</CardHeader>
				<BaseCreateEditTripForm
					type="edit"
					trip={trip}
					onSubmit={() => toast.success('Edited the trip successfully')}
					ContentWrapper={CardContent}
					SubmitWrapper={({ children }) => (
						<CardFooter className="mt-4 justify-end bg-neutral-100 py-4">
							{children}
						</CardFooter>
					)}
				/>
			</Card>
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-xl">Delete Trip</CardTitle>
					<CardDescription>
						This trip and all associated data will be permanently deleted. This
						action is irreversible.
					</CardDescription>
				</CardHeader>
				<CardFooter className="mt-4 justify-end bg-red-100 py-4">
					<DeleteTripDialog trip={trip} />
				</CardFooter>
			</Card>
		</div>
	);
}
