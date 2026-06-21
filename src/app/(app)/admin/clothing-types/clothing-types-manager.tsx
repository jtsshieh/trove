'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
	ClothingTypePicker,
	type PickerType,
} from '@/components/clothing-type-picker';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { ApiError } from '@/lib/api/errors';

import * as api from './_data/api';

export function ClothingTypesManager({
	existing,
	catalog,
}: {
	existing: PickerType[];
	catalog: PickerType[];
}) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [keep, setKeep] = useState<PickerType[]>(existing);
	const [exclude, setExclude] = useState<PickerType[]>(() => {
		const names = new Set(existing.map((t) => t.name));
		return catalog.filter((t) => !names.has(t.name));
	});

	const moveToKeep = (name: string) => {
		const item = exclude.find((t) => t.name === name);
		if (!item) return;
		startTransition(async () => {
			try {
				await api.createClothingTypes([item]);
				setExclude((x) => x.filter((t) => t.name !== name));
				setKeep((k) => [...k, item]);
				router.refresh();
			} catch (e) {
				toast.error(e instanceof ApiError ? e.message : 'Something went wrong');
			}
		});
	};

	const moveToExclude = (name: string) => {
		const item = keep.find((t) => t.name === name);
		if (!item) return;
		startTransition(async () => {
			try {
				await api.deleteClothingType(name);
				setKeep((k) => k.filter((t) => t.name !== name));
				setExclude((x) => [...x, item]);
				router.refresh();
			} catch (e) {
				toast.error(
					e instanceof ApiError ? e.message : 'Could not remove type',
				);
			}
		});
	};

	const add = (type: PickerType) => {
		if ([...keep, ...exclude].some((t) => t.name === type.name)) {
			toast.error(`"${type.name}" already exists`);
			return;
		}
		startTransition(async () => {
			try {
				await api.createClothingTypes([type]);
				setKeep((k) => [...k, type]);
				router.refresh();
			} catch (e) {
				toast.error(e instanceof ApiError ? e.message : 'Something went wrong');
			}
		});
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Clothing types</CardTitle>
				<CardDescription>
					The global catalog of clothing types. Removing a type in use is
					blocked.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ClothingTypePicker
					keep={keep}
					exclude={exclude}
					onMoveToExclude={moveToExclude}
					onMoveToKeep={moveToKeep}
					onAdd={add}
					busy={pending}
				/>
			</CardContent>
		</Card>
	);
}
