import type { Clothing } from '@/generated/prisma/client';

export function generateClothingName({
	color,
	brandName,
	brandLine,
	typeName,
	modifier,
}: Clothing) {
	const arr = [];
	arr.push(color, brandName);
	if (brandLine) arr.push(brandLine);
	arr.push(typeName);
	if (modifier) arr.push(`(${modifier})`);
	return arr.join(' ');
}
