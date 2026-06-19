'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '../../../../../../lib/db.server';
import { getAllBrands } from './fetchers';
import { createBrandSchema, editBrandSchema } from './schemas';

export async function fetchAllBrands() {
	return getAllBrands();
}

export async function createBrand(data: unknown) {
	const { name } = createBrandSchema.parse(data);
	await prisma.brand.create({
		data: {
			name,
		},
	});

	revalidatePath('/dashboard/wardrobe/brands');
	return {
		type: 'success',
		message: 'Brand successfully added',
	};
}

export async function editBrand(brandName: string, data: unknown) {
	const { name } = editBrandSchema.parse(data);

	await prisma.brand.update({
		where: {
			name: brandName,
		},
		data: {
			name,
		},
	});

	revalidatePath('/dashboard/wardrobe/brands');
	return {
		type: 'success',
		message: 'Brand successfully edited',
	};
}

export async function deleteBrand(brandName: string) {
	await prisma.brand.delete({
		where: {
			name: brandName,
		},
	});

	revalidatePath('/dashboard/wardrobe/brands');
	return {
		type: 'success',
		message: 'Brand successfully deleted',
	};
}
