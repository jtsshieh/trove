import { cache } from 'react';

import { getCurrentUserSafe } from '@/app/(app)/account/_data/fetchers';
import { getAllContainers } from '@/app/(app)/closet/packing-gear/containers/_data/fetchers';
import { prisma } from '@/lib/db.server';

/**
 * The containers provisioning board: every container provision with its packed
 * items (ordered by containerOrder), plus the unassigned pool (provisions not yet
 * in any container) the user drags from.
 */
export const getContainersBoard = cache(async (tripId: string) => {
	const user = await getCurrentUserSafe();

	return prisma.trip.findFirst({
		where: { id: tripId, userId: user.id },
		include: {
			containerProvisions: {
				orderBy: [{ tripOrder: 'asc' }, { container: { order: 'asc' } }],
				include: {
					container: true,
					clothingProvisions: {
						include: { clothing: { include: { type: true } } },
						orderBy: { containerOrder: 'asc' },
					},
					essentialProvisions: {
						include: { essential: true },
						orderBy: { containerOrder: 'asc' },
					},
				},
			},
			clothingProvisions: {
				where: { containerProvisionId: null },
				include: { clothing: { include: { type: true } } },
				orderBy: [{ section: 'asc' }, { day: 'asc' }, { dayOrder: 'asc' }],
			},
			essentialProvisions: {
				where: { containerProvisionId: null },
				include: { essential: true },
				orderBy: [{ section: 'asc' }, { day: 'asc' }, { dayOrder: 'asc' }],
			},
			clothingBrings: true,
		},
	});
});

export type ContainersBoard = NonNullable<
	Awaited<ReturnType<typeof getContainersBoard>>
>;

/**
 * The full provisioning view in one shot: the trip's containers board plus the
 * catalog of containers not yet on the trip (the "Add container" pool). Every board
 * mutation — including adding/removing a container — invalidates this single query,
 * so the board and the add-dialog's available list refresh together. Null when the
 * trip isn't found / owned.
 */
export const getContainerBoardData = cache(async (tripId: string) => {
	const [board, containers] = await Promise.all([
		getContainersBoard(tripId),
		getAllContainers(),
	]);
	if (!board) return null;

	// Offer a container as long as the user still has units of it free (owned quantity
	// minus how many are already on this trip). Each unit becomes its own card, so a
	// 3-of-a-kind container can be added up to three times.
	const onTrip = new Map<string, number>();
	for (const cp of board.containerProvisions)
		onTrip.set(cp.containerId, (onTrip.get(cp.containerId) ?? 0) + 1);
	const available = containers
		.map((c) => ({ ...c, remaining: c.quantity - (onTrip.get(c.id) ?? 0) }))
		.filter((c) => c.remaining > 0);

	return { board, available };
});

export type ContainerBoardData = NonNullable<
	Awaited<ReturnType<typeof getContainerBoardData>>
>;
