import type { Clothing } from '@/generated/prisma/client';

export function generateClothingName({
	color,
	brandName,
	brandLine,
	typeName,
	modifier,
	number,
}: Clothing) {
	const arr = [];
	arr.push(color, brandName);
	if (brandLine) arr.push(brandLine);
	arr.push(typeName);
	if (modifier || number) {
		const subarr = [];
		if (modifier) subarr.push(modifier);
		if (number) subarr.push(number);
		arr.push(`(${subarr.join(' ')})`);
	}
	return arr.join(' ');
}
