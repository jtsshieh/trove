import { ClothingCategory } from '@/generated/prisma/enums';

/**
 * Suggested clothing-type catalog. Used to pre-fill the "Keep" column of the
 * setup/admin ClothingTypePicker; the admin curates which actually get created.
 */
export const DEFAULT_CLOTHING_TYPES: {
	name: string;
	category: ClothingCategory;
}[] = [
	// Tops
	{ name: 'T-shirt', category: ClothingCategory.Top },
	{ name: 'Long Sleeve Shirt', category: ClothingCategory.Top },
	{ name: 'Tank Top', category: ClothingCategory.Top },
	{ name: 'Polo', category: ClothingCategory.Top },
	{ name: 'Dress Shirt', category: ClothingCategory.Top },
	{ name: 'Flannel', category: ClothingCategory.Top },
	{ name: 'Hoodie', category: ClothingCategory.Top },
	{ name: 'Quarter Zip', category: ClothingCategory.Top },
	{ name: 'Sweater', category: ClothingCategory.Top },
	{ name: 'Sweatshirt', category: ClothingCategory.Top },
	{ name: 'Jacket', category: ClothingCategory.Top },
	{ name: 'Coat', category: ClothingCategory.Top },
	// Bottoms
	{ name: 'Jeans', category: ClothingCategory.Bottom },
	{ name: 'Chinos', category: ClothingCategory.Bottom },
	{ name: 'Dress Pants', category: ClothingCategory.Bottom },
	{ name: 'Shorts', category: ClothingCategory.Bottom },
	{ name: 'Sweatpants', category: ClothingCategory.Bottom },
	{ name: 'Joggers', category: ClothingCategory.Bottom },
	{ name: 'Leggings', category: ClothingCategory.Bottom },
	{ name: 'Skirt', category: ClothingCategory.Bottom },
	// Accessories
	{ name: 'Socks', category: ClothingCategory.Accessory },
	{ name: 'Underwear', category: ClothingCategory.Accessory },
	{ name: 'Hat', category: ClothingCategory.Accessory },
	{ name: 'Beanie', category: ClothingCategory.Accessory },
	{ name: 'Belt', category: ClothingCategory.Accessory },
	{ name: 'Scarf', category: ClothingCategory.Accessory },
	{ name: 'Gloves', category: ClothingCategory.Accessory },
	{ name: 'Tie', category: ClothingCategory.Accessory },
	{ name: 'Sunglasses', category: ClothingCategory.Accessory },
];
