// TSA 3-1-1 carry-on liquids compliance. Only consumable bathroom liquids count;
// appliances, launderables, non-liquid forms, and non-carry-on bags are exempt.
// Type-only prisma imports keep this module runtime-pure (easy to unit-test).

import type { BathroomForm, BathroomNature } from '@/generated/prisma/enums';

import { QUART_BAG_ML, TSA_CONTAINER_LIMIT_ML, formatVolume } from './units';

const LIQUID_FORMS = new Set<BathroomForm>([
	'Liquid',
	'Gel',
	'Aerosol',
	'Cream',
	'Paste',
]);

export function isLiquidForm(form: BathroomForm | null | undefined): boolean {
	return form != null && LIQUID_FORMS.has(form);
}

export interface ComplianceItem {
	id: string;
	name: string;
	nature: BathroomNature;
	form: BathroomForm | null;
	capacityMl: number | null;
}

export type ItemStatus =
	| 'exempt' // not a consumable liquid → no limit applies
	| 'compliant' // a liquid ≤ 100 mL
	| 'overContainerLimit' // a liquid > 100 mL
	| 'unknownCapacity'; // a liquid with no recorded size

export interface ItemResult {
	id: string;
	name: string;
	status: ItemStatus;
	capacityMl: number | null;
}

export interface BagComplianceResult {
	status: 'compliant' | 'over';
	items: ItemResult[];
	liquidCount: number; // # of compliant liquid containers
	totalCompliantLiquidMl: number; // Σ capacity of compliant liquids
	quartBagMl: number;
	quartBagOver: boolean;
	overLimitItems: ItemResult[];
	violations: string[]; // human-readable, conversion-aware
}

function classify(item: ComplianceItem): ItemStatus {
	if (item.nature !== 'Consumable' || !isLiquidForm(item.form)) return 'exempt';
	if (item.capacityMl == null) return 'unknownCapacity';
	return item.capacityMl > TSA_CONTAINER_LIMIT_ML
		? 'overContainerLimit'
		: 'compliant';
}

export function evaluateBag(items: ComplianceItem[]): BagComplianceResult {
	const results: ItemResult[] = items.map((i) => ({
		id: i.id,
		name: i.name,
		status: classify(i),
		capacityMl: i.capacityMl,
	}));

	const overLimitItems = results.filter((r) => r.status === 'overContainerLimit');
	const compliant = results.filter((r) => r.status === 'compliant');
	const totalCompliantLiquidMl = compliant.reduce(
		(sum, r) => sum + (r.capacityMl ?? 0),
		0,
	);
	const quartBagOver = totalCompliantLiquidMl > QUART_BAG_ML;

	const violations: string[] = [];
	for (const r of overLimitItems) {
		const ml = r.capacityMl ?? 0;
		violations.push(
			`${r.name}: ${formatVolume(ml, 'Milliliters')} (${formatVolume(ml, 'FluidOunces')}) — over the 100 mL / 3.4 fl oz limit`,
		);
	}
	if (quartBagOver) {
		violations.push(
			`Liquids total ${formatVolume(totalCompliantLiquidMl, 'Milliliters')} — over the ~1 quart bag`,
		);
	}

	return {
		status: overLimitItems.length > 0 || quartBagOver ? 'over' : 'compliant',
		items: results,
		liquidCount: compliant.length,
		totalCompliantLiquidMl,
		quartBagMl: QUART_BAG_ML,
		quartBagOver,
		overLimitItems,
		violations,
	};
}

export interface TripBag {
	luggageProvisionId: string;
	luggageName: string;
	items: ComplianceItem[];
}

export interface TripComplianceResult {
	status: 'compliant' | 'over';
	bags: {
		luggageProvisionId: string;
		luggageName: string;
		result: BagComplianceResult;
	}[];
}

// Evaluate only the carry-on bags (callers pre-filter to LuggageProvision.kind = CarryOn).
export function evaluateTripCarryOn(bags: TripBag[]): TripComplianceResult {
	const evaluated = bags.map((b) => ({
		luggageProvisionId: b.luggageProvisionId,
		luggageName: b.luggageName,
		result: evaluateBag(b.items),
	}));
	return {
		status: evaluated.some((b) => b.result.status === 'over') ? 'over' : 'compliant',
		bags: evaluated,
	};
}
