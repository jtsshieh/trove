'use client';

import { Suspense, useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { EssentialBulkAddDialog } from './essential-bulk-add-dialog';
import { CreateEssentialDialog } from './essential-dialogs';
import { CreateEssentialGroupDialog } from './essential-group-dialogs';
import { EssentialGroupsContent, EssentialsListContent } from './page-wrapper';

export function EssentialsTabs() {
	const [tab, setTab] = useState('essentials');

	return (
		<Tabs
			value={tab}
			onValueChange={(value) => setTab(value as string)}
			className="flex-1"
		>
			<div className="flex flex-wrap items-center justify-between gap-4">
				<TabsList>
					<TabsTrigger value="essentials">Essentials</TabsTrigger>
					<TabsTrigger value="groups">Groups</TabsTrigger>
				</TabsList>
				<div className="flex items-center gap-2">
					{tab === 'essentials' ? (
						<>
							<EssentialBulkAddDialog />
							<CreateEssentialDialog />
						</>
					) : (
						<Suspense fallback={null}>
							<CreateEssentialGroupDialog />
						</Suspense>
					)}
				</div>
			</div>
			<TabsContent value="essentials" className="mt-4">
				<EssentialsListContent />
			</TabsContent>
			<TabsContent value="groups" className="mt-4">
				<EssentialGroupsContent />
			</TabsContent>
		</Tabs>
	);
}
