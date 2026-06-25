'use client';

import { File, HandSoap, Plug } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import { EmptyList } from '@/components/empty-list';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ItemDisplay } from '@/components/ui/item-display';
import { DisplayMode, EssentialKind } from '@/generated/prisma/enums';

import type { EssentialItemCatalog } from '../[tripId]/_data/essential-catalog';
import { resolveEssentialItem } from '../[tripId]/_data/essential-item';
import type { EssentialGroupWithItems } from './_data/api';
import {
	DeleteTemplateGroupDialog,
	EditTemplateGroupDialog,
} from './template-group-dialogs';

const APP_ICONS: Record<EssentialKind, ReactNode> = {
	[EssentialKind.Bathroom]: <HandSoap className="size-1/2 opacity-50" />,
	[EssentialKind.Document]: <File className="size-1/2 opacity-50" />,
	[EssentialKind.Electronic]: <Plug className="size-1/2 opacity-50" />,
};

export function TemplatesList({
	groups,
	catalog,
}: {
	groups: EssentialGroupWithItems[];
	catalog: EssentialItemCatalog;
}) {
	if (groups.length === 0)
		return (
			<EmptyList
				main="You have no templates"
				sub="Create one with the Create template button in the top right corner."
			/>
		);

	return (
		<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{groups.map((group) => (
				<Card key={group.id} className="flex flex-col">
					<CardHeader className="flex-1 gap-3">
						<div className="flex flex-col gap-0.5">
							<CardTitle>{group.name}</CardTitle>
							<span className="text-muted-foreground text-xs">
								{group.items.length}{' '}
								{group.items.length === 1 ? 'item' : 'items'}
							</span>
						</div>
						{group.items.length > 0 && (
							<div className="flex flex-col gap-1.5">
								{group.items.map((item) => {
									const resolved = resolveEssentialItem(item);
									return (
										<ItemDisplay
											key={item.id}
											name={resolved.name}
											imageKey={resolved.imageKey}
											fallbackIcon={APP_ICONS[resolved.kind]}
											mode={DisplayMode.Both}
											size="chip"
										/>
									);
								})}
							</div>
						)}
					</CardHeader>
					<CardFooter className="justify-between">
						<DeleteTemplateGroupDialog group={group} />
						<EditTemplateGroupDialog group={group} catalog={catalog} />
					</CardFooter>
				</Card>
			))}
		</div>
	);
}
