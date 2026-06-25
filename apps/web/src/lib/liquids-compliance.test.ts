import { describe, expect, it } from 'vitest';

import {
	type ComplianceItem,
	evaluateBag,
	evaluateTripCarryOn,
	isLiquidForm,
} from './liquids-compliance';

const item = (over: Partial<ComplianceItem>): ComplianceItem => ({
	id: 'x',
	name: 'X',
	nature: 'Consumable',
	form: 'Liquid',
	capacityMl: 50,
	...over,
});

describe('liquids-compliance', () => {
	it('isLiquidForm', () => {
		expect(isLiquidForm('Liquid')).toBe(true);
		expect(isLiquidForm('Gel')).toBe(true);
		expect(isLiquidForm('Paste')).toBe(true);
		expect(isLiquidForm('Powder')).toBe(false);
		expect(isLiquidForm(null)).toBe(false);
	});

	it('classifies a mixed bag', () => {
		const r = evaluateBag([
			item({ id: 'soap', name: 'Bar Soap', form: null }), // exempt (non-liquid)
			item({ id: 'tb', name: 'Toothbrush', nature: 'Appliance', form: null }), // exempt
			item({ id: 'towel', name: 'Towel', nature: 'Launderable', form: null }), // exempt
			item({ id: 'sun', name: 'Sunscreen', capacityMl: 88 }), // compliant
			item({ id: 'sh', name: 'Shampoo', capacityMl: 250 }), // over the limit
			item({ id: 'unk', name: 'Mystery', capacityMl: null }), // unknown capacity
		]);
		expect(r.status).toBe('over');
		expect(r.overLimitItems.map((i) => i.id)).toEqual(['sh']);
		expect(r.liquidCount).toBe(1); // only the sunscreen is a compliant liquid
		expect(r.items.find((i) => i.id === 'unk')?.status).toBe('unknownCapacity');
		expect(r.violations.length).toBeGreaterThan(0);
	});

	it('flags quart-bag overflow', () => {
		const many = Array.from({ length: 11 }, (_, i) =>
			item({ id: `b${i}`, capacityMl: 100 }),
		);
		const r = evaluateBag(many); // 11 × 100 mL = 1100 mL > 1000
		expect(r.quartBagOver).toBe(true);
		expect(r.status).toBe('over');
	});

	it('an all-compliant bag passes', () => {
		const r = evaluateBag([item({ capacityMl: 50 }), item({ capacityMl: 100 })]);
		expect(r.status).toBe('compliant');
		expect(r.overLimitItems).toHaveLength(0);
	});

	it('trip verdict is over if any carry-on bag is over', () => {
		const r = evaluateTripCarryOn([
			{ luggageProvisionId: 'a', luggageName: 'Carry-on', items: [item({ capacityMl: 250 })] },
			{ luggageProvisionId: 'b', luggageName: 'Personal', items: [item({ capacityMl: 50 })] },
		]);
		expect(r.status).toBe('over');
	});
});
