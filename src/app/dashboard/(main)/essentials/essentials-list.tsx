'use client';

import { File, HandSoap, Plug } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import type { Essential } from '@/generated/prisma/client';
import { EssentialCategory } from '@/generated/prisma/enums';

import { Card, CardFooter } from '@/components/ui/card';
import { imageSrc } from '@/lib/images';

import { EmptyList } from '../../../../components/empty-list';
import {
	DeleteEssentialDialog,
	EditEssentialDialog,
} from './essential-dialogs';

const CATEGORY_ICONS: Record<EssentialCategory, ReactNode> = {
	[EssentialCategory.Toiletry]: (
		<HandSoap className="absolute inset-0 m-auto size-1/3 opacity-40" />
	),
	[EssentialCategory.Document]: (
		<File className="absolute inset-0 m-auto size-1/3 opacity-40" />
	),
	[EssentialCategory.Electronic]: (
		<Plug className="absolute inset-0 m-auto size-1/3 opacity-40" />
	),
};

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
								<EssentialCard key={essential.id} essential={essential} />
							))}
					</div>
				</div>
			))}
		</div>
	);
}

function EssentialCard({ essential }: { essential: Essential }) {
	const stacked = essential.quantity > 1;

	return (
		<Card className="gap-0 py-0">
			<div className="relative aspect-square w-full overflow-hidden bg-muted text-muted-foreground">
				{essential.imageKey ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={imageSrc(essential.imageKey)}
						alt={essential.name}
						loading="lazy"
						className="size-full object-cover"
					/>
				) : (
					CATEGORY_ICONS[essential.category]
				)}
				{stacked && (
					<span className="bg-brand-subtle text-brand absolute top-1.5 right-1.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums shadow-sm">
						×{essential.quantity}
					</span>
				)}
			</div>
			<div className="flex flex-1 flex-col gap-2 p-2.5">
				<div className="flex flex-col">
					<span className="font-heading text-sm leading-snug font-medium">
						{essential.name}
					</span>
					<span className="text-xs text-muted-foreground">
						{essential.category}
					</span>
				</div>
				<CardFooter className="mt-auto justify-between gap-2 rounded-none border-t-0 bg-transparent p-0">
					<DeleteEssentialDialog essential={essential} />
					<EditEssentialDialog essential={essential} />
				</CardFooter>
			</div>
		</Card>
	);
}
