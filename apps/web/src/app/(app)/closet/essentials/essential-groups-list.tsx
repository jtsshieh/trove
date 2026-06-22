'use client';

import { File, HandSoap, Plug } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import type {
	Essential,
	EssentialGroup,
	EssentialGroupItem,
} from '@/generated/prisma/client';
import { DisplayMode, EssentialCategory } from '@/generated/prisma/enums';

import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ItemDisplay } from '@/components/ui/item-display';

import { EmptyList } from '@/components/empty-list';
import {
	DeleteEssentialGroupDialog,
	EditEssentialGroupDialog,
} from './essential-group-dialogs';

const CATEGORY_ICONS: Record<EssentialCategory, ReactNode> = {
	[EssentialCategory.Toiletry]: <HandSoap className="size-1/2 opacity-50" />,
	[EssentialCategory.Document]: <File className="size-1/2 opacity-50" />,
	[EssentialCategory.Electronic]: <Plug className="size-1/2 opacity-50" />,
};

export type EssentialGroupWithItems = EssentialGroup & {
	items: (EssentialGroupItem & { essential: Essential })[];
};

interface EssentialGroupsListProps {
	groups: EssentialGroupWithItems[];
	essentials: Essential[];
}

export function EssentialGroupsList({
	groups,
	essentials,
}: EssentialGroupsListProps) {
	if (groups.length === 0)
		return (
			<EmptyList
				main="You have no essential groups"
				sub="You can create one by clicking the Create group button in the top right corner."
			/>
		);

	return (
		<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{groups.map((group) => (
				<Card key={group.id} className="flex flex-col">
					<CardHeader className="flex-1 gap-3">
						<div className="flex flex-col gap-0.5">
							<CardTitle>{group.name}</CardTitle>
							<span className="text-xs text-muted-foreground">
								{group.items.length}{' '}
								{group.items.length === 1 ? 'essential' : 'essentials'}
							</span>
						</div>
						{group.items.length > 0 && (
							<div className="flex flex-col gap-1.5">
								{group.items.map((item) => (
									<ItemDisplay
										key={item.id}
										name={item.essential.name}
										imageKey={item.essential.imageKey}
										fallbackIcon={CATEGORY_ICONS[item.essential.category]}
										mode={DisplayMode.Both}
										size="chip"
									/>
								))}
							</div>
						)}
					</CardHeader>
					<CardFooter className="justify-between">
						<DeleteEssentialGroupDialog group={group} />
						<EditEssentialGroupDialog group={group} essentials={essentials} />
					</CardFooter>
				</Card>
			))}
		</div>
	);
}
