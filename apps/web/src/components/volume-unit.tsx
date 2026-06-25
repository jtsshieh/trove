'use client';

import { useRouter } from 'next/navigation';
import {
	createContext,
	useContext,
	useState,
	useTransition,
	type ReactNode,
} from 'react';

import { updateUserSettings } from '@/app/(app)/account/_data/api';
import { VolumeUnit } from '@/generated/prisma/enums';

import { Segmented } from './segmented';

interface VolumeUnitContextValue {
	unit: VolumeUnit;
	setUnit: (unit: VolumeUnit) => void;
}

const VolumeUnitContext = createContext<VolumeUnitContextValue>({
	unit: VolumeUnit.Milliliters,
	setUnit: () => {},
});

export function VolumeUnitProvider({
	initial,
	children,
}: {
	initial: VolumeUnit;
	children: ReactNode;
}) {
	const [unit, setUnit] = useState<VolumeUnit>(initial);
	return (
		<VolumeUnitContext.Provider value={{ unit, setUnit }}>
			{children}
		</VolumeUnitContext.Provider>
	);
}

export function useVolumeUnit() {
	return useContext(VolumeUnitContext).unit;
}

/** mL / fl oz toggle. Optimistic locally, persisted per user. */
export function VolumeUnitToggle() {
	const { unit, setUnit } = useContext(VolumeUnitContext);
	const [, startTransition] = useTransition();
	const router = useRouter();

	function change(next: VolumeUnit) {
		setUnit(next);
		startTransition(async () => {
			await updateUserSettings({ volumeUnit: next });
			// The volume unit is server-rendered + prop-drilled as `initial`; refresh
			// so a later render reads the persisted value (replaces revalidatePath).
			router.refresh();
		});
	}

	return (
		<Segmented
			value={unit}
			onValueChange={change}
			options={[
				{
					value: VolumeUnit.Milliliters,
					label: 'mL',
					title: 'Milliliters',
				},
				{
					value: VolumeUnit.FluidOunces,
					label: 'fl oz',
					title: 'Fluid ounces',
				},
			]}
		/>
	);
}
