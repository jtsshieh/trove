'use client';

import type { Essential } from '@/generated/prisma/client';
import { EssentialCategory } from '@/generated/prisma/enums';

import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

import { EmptyList } from '../../../../components/empty-list';
import {
	DeleteEssentialDialog,
	EditEssentialDialog,
} from './essential-dialogs';

interface EssentialsListProps {
	essentials: Essential[];
}

export function EssentialsList({ essentials }: EssentialsListProps) {
	if (essentials.length === 0)
		return (
			<EmptyList
				main="You have no items in your essentials"
				sub="You can create one by clicking the Add Essential button in the top right corner."
			/>
		);
	return (
		<div className="flex flex-col gap-8">
			{Object.values(EssentialCategory).map((category) => (
				<div key={category}>
					<h3 className="mb-2 text-xl font-bold">{category}</h3>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
						{essentials
							.filter((essential) => essential.category === category)
							.map((essential) => (
								<Card key={essential.id} className="flex flex-col">
									<CardHeader className="flex-1">
										<CardTitle>{essential.name}</CardTitle>
									</CardHeader>
									<CardFooter className="justify-between">
										<DeleteEssentialDialog essential={essential} />
										<EditEssentialDialog essential={essential} />
									</CardFooter>
								</Card>
							))}
					</div>
				</div>
			))}
		</div>
	);
}
