'use client';

import { Suspense, useState, type ReactNode } from 'react';

import { DisplayModeProvider } from '@/components/display-mode';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { DisplayMode } from '@/generated/prisma/enums';

import { OutfitActionsProvider } from '@/app/(app)/outfits/outfit-actions-context';
import { OutfitTabActions } from '@/app/(app)/outfits/outfit-tab-actions';
import { ClothesTabActions } from './clothes-tab-actions';
import { CreateBrandDialog } from './brands/brand-dialogs';

export function WardrobeTabs({
	clothes,
	outfits,
	brands,
	displayMode,
}: {
	clothes: ReactNode;
	outfits: ReactNode;
	brands: ReactNode;
	displayMode: DisplayMode;
}) {
	const [tab, setTab] = useState('clothes');

	return (
		<DisplayModeProvider initial={displayMode}>
			<OutfitActionsProvider>
				<Tabs
					value={tab}
					onValueChange={(value) => setTab(value as string)}
					className="flex-1"
				>
					<div className="flex flex-wrap items-center justify-between gap-4">
						<TabsList>
							<TabsTrigger value="clothes">Clothes</TabsTrigger>
							<TabsTrigger value="outfits">Outfits</TabsTrigger>
							<TabsTrigger value="brands">Brands</TabsTrigger>
						</TabsList>
						<div className="flex items-center gap-2">
							{tab === 'clothes' ? (
								<Suspense fallback={null}>
									<ClothesTabActions />
								</Suspense>
							) : tab === 'outfits' ? (
								<OutfitTabActions />
							) : (
								<CreateBrandDialog />
							)}
						</div>
					</div>
					<TabsContent value="clothes" className="mt-4 flex flex-col">
						{clothes}
					</TabsContent>
					<TabsContent value="outfits" className="mt-4 flex flex-col">
						{outfits}
					</TabsContent>
					<TabsContent value="brands" className="mt-4 flex flex-col">
						{brands}
					</TabsContent>
				</Tabs>
			</OutfitActionsProvider>
		</DisplayModeProvider>
	);
}
