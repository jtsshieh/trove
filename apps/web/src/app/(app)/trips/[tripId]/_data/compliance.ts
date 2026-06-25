import { cache } from 'react';

import { getCurrentUserSafe } from '@/lib/auth';
import { prisma } from '@/lib/db.server';
import {
	type ComplianceItem,
	evaluateTripCarryOn,
} from '@/lib/liquids-compliance';

const variantInclude = {
	bathroomVariant: { include: { product: true } },
} as const;

// TSA 3-1-1 verdict for a trip's CARRY-ON bags: gathers every bathroom item packed
// into a carry-on (directly or via a container) and evaluates the liquids rule.
export const getCarryOnCompliance = cache(async (tripId: string) => {
	const user = await getCurrentUserSafe();
	const trip = await prisma.trip.findFirst({
		where: { id: tripId, userId: user.id },
		select: { id: true },
	});
	if (!trip) return null;

	const bags = await prisma.luggageProvision.findMany({
		where: { tripId, kind: 'CarryOn' },
		include: {
			luggage: { select: { name: true } },
			essentialProvisions: { where: { kind: 'Bathroom' }, include: variantInclude },
			containerProvisions: {
				include: {
					essentialProvisions: {
						where: { kind: 'Bathroom' },
						include: variantInclude,
					},
				},
			},
		},
	});

	return evaluateTripCarryOn(
		bags.map((bag) => {
			const provisions = [
				...bag.essentialProvisions,
				...bag.containerProvisions.flatMap((cp) => cp.essentialProvisions),
			];
			const items: ComplianceItem[] = provisions
				.map((p) => p.bathroomVariant)
				.filter((v): v is NonNullable<typeof v> => v != null)
				.map((v) => ({
					id: v.id,
					name: v.label ? `${v.product.name} · ${v.label}` : v.product.name,
					nature: v.product.nature,
					form: v.product.form,
					capacityMl: v.capacityMl,
				}));
			return {
				luggageProvisionId: bag.id,
				luggageName: bag.luggage.name,
				items,
			};
		}),
	);
});
