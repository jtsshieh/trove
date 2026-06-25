import { describe, expect, it } from 'vitest';

import {
	ML_PER_FL_OZ,
	formatVolume,
	formatVolumeBoth,
	mlToOz,
	ozToMl,
	parseVolumeInput,
} from './units';

describe('units', () => {
	it('mlToOz / ozToMl round-trip', () => {
		expect(mlToOz(ML_PER_FL_OZ)).toBeCloseTo(1);
		expect(ozToMl(1)).toBeCloseTo(ML_PER_FL_OZ);
		expect(mlToOz(ozToMl(8))).toBeCloseTo(8);
	});

	it('parseVolumeInput converts and rejects bad input', () => {
		expect(parseVolumeInput('250', 'Milliliters')).toBe(250);
		expect(parseVolumeInput('8', 'FluidOunces')).toBeCloseTo(236.588);
		expect(parseVolumeInput(8, 'FluidOunces')).toBeCloseTo(236.588);
		expect(parseVolumeInput('', 'Milliliters')).toBeNull();
		expect(parseVolumeInput('-5', 'Milliliters')).toBeNull();
		expect(parseVolumeInput('abc', 'Milliliters')).toBeNull();
	});

	it('formatVolume rounds mL and trims oz', () => {
		expect(formatVolume(250, 'Milliliters')).toBe('250 mL');
		expect(formatVolume(100, 'FluidOunces')).toBe('3.4 fl oz'); // the labeled TSA limit
		expect(formatVolume(ozToMl(8), 'FluidOunces')).toBe('8 fl oz'); // trailing .0 trimmed
	});

	it('formatVolumeBoth shows both units', () => {
		expect(formatVolumeBoth(250, 'Milliliters')).toBe('250 mL (8.5 fl oz)');
	});
});
