import { DEFAULT_CLOTHING_TYPES } from '@/lib/clothing-types-catalog';
import { listClothingTypes } from '@/lib/domains/clothing-types/service';

import { ClothingTypesManager } from './clothing-types-manager';

export default async function AdminClothingTypesPage() {
	const existing = await listClothingTypes();
	return (
		<div className="mx-auto w-full max-w-screen-md">
			<ClothingTypesManager
				existing={existing.map((t) => ({ name: t.name, category: t.category }))}
				catalog={DEFAULT_CLOTHING_TYPES}
			/>
		</div>
	);
}
