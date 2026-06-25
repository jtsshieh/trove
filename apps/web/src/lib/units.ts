// Volume conversion helpers. Canonical storage is milliliters; ounces are a
// display/entry convenience. Pure (no imports) so it's trivially unit-testable.

export const ML_PER_FL_OZ = 29.5735;

// TSA 3-1-1 carry-on liquids rule.
export const TSA_CONTAINER_LIMIT_ML = 100;
export const TSA_CONTAINER_LIMIT_OZ = 3.4; // the labeled limit (100 mL ≈ 3.381 oz)
export const QUART_BAG_ML = 1000; // ~1 L quart bag

export type VolumeUnitKey = 'Milliliters' | 'FluidOunces';

export function mlToOz(ml: number): number {
	return ml / ML_PER_FL_OZ;
}

export function ozToMl(oz: number): number {
	return oz * ML_PER_FL_OZ;
}

// Parse a user-entered value (in the given unit) into canonical mL. Returns null
// on empty / non-numeric / negative input.
export function parseVolumeInput(
	value: string | number,
	unit: VolumeUnitKey,
): number | null {
	const n = typeof value === 'number' ? value : parseFloat(value);
	if (!Number.isFinite(n) || n < 0) return null;
	return unit === 'FluidOunces' ? ozToMl(n) : n;
}

// Round to `decimals` places and drop a trailing ".0" (so 8.0 → "8").
function trimmed(n: number, decimals: number): string {
	return parseFloat(n.toFixed(decimals)).toString();
}

// mL → rounded integer ("250 mL"); oz → 1 decimal ("3.4 fl oz", "8 fl oz").
export function formatVolume(ml: number, unit: VolumeUnitKey): string {
	if (unit === 'FluidOunces') return `${trimmed(mlToOz(ml), 1)} fl oz`;
	return `${Math.round(ml)} mL`;
}

// "250 mL (8.5 fl oz)" — the primary unit first, the other in parentheses.
export function formatVolumeBoth(ml: number, primary: VolumeUnitKey): string {
	const other: VolumeUnitKey =
		primary === 'Milliliters' ? 'FluidOunces' : 'Milliliters';
	return `${formatVolume(ml, primary)} (${formatVolume(ml, other)})`;
}
