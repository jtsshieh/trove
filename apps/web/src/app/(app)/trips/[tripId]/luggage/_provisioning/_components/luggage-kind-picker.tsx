'use client';

import { Briefcase, Backpack, Luggage } from 'lucide-react';

import { Segmented } from '@/components/segmented';
import { LuggageKind } from '@/generated/prisma/enums';

import { useSetLuggageProvisionKind } from '../_data/mutations';

/**
 * Per-suitcase carry-on / checked / personal picker. Only CarryOn bags are
 * evaluated for TSA 3-1-1 liquids compliance, so this is how a traveler tells the
 * planner which bags go through the cabin. Optimistic via the board invalidation.
 */
export function LuggageKindPicker({
	tripId,
	luggageProvisionId,
	kind,
}: {
	tripId: string;
	luggageProvisionId: string;
	kind: LuggageKind;
}) {
	const setKind = useSetLuggageProvisionKind(tripId);

	function change(next: LuggageKind) {
		if (next === kind) return;
		setKind.mutate({ id: luggageProvisionId, input: { kind: next } });
	}

	return (
		<Segmented
			value={kind}
			onValueChange={change}
			options={[
				{
					value: LuggageKind.CarryOn,
					icon: <Briefcase />,
					title: 'Carry-on',
				},
				{
					value: LuggageKind.Checked,
					icon: <Luggage />,
					title: 'Checked',
				},
				{
					value: LuggageKind.Personal,
					icon: <Backpack />,
					title: 'Personal item',
				},
			]}
		/>
	);
}
