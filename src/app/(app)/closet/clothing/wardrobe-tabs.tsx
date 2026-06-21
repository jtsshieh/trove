'use client';

import { Suspense, useState, type ReactNode } from 'react';

import { DisplayModeProvider } from '@/components/display-mode';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { DisplayMode } from '@/generated/prisma/enums';

import { CreateBrandDialog } from './brands/brand-dialogs';
import { ClothesTabActions } from './clothes-tab-actions';

export function WardrobeTabs({
	clothes,
	brands,
	types,
	displayMode,
}: {
	clothes: ReactNode;
	brands: ReactNode;
	types: ReactNode;
	displayMode: DisplayMode;
}) {
	const [tab, setTab] = useState('clothes');

	return (
		<DisplayModeProvider initial={displayMode}>
			<Tabs
				value={tab}
				onValueChange={(value) => setTab(value as string)}
				className="flex-1"
			>
				<div className="flex flex-wrap items-center justify-between gap-4">
					<TabsList>
						<TabsTrigger value="clothes">Clothes</TabsTrigger>
						<TabsTrigger value="brands">Brands</TabsTrigger>
						<TabsTrigger value="types">Types</TabsTrigger>
					</TabsList>
					<div className="flex items-center gap-2">
						{tab === 'clothes' && (
							<Suspense fallback={null}>
								<ClothesTabActions />
							</Suspense>
						)}
						{tab === 'brands' && <CreateBrandDialog />}
						{/* The Types tab carries its own add/remove controls. */}
					</div>
				</div>
				<TabsContent value="clothes" className="mt-4 flex flex-col">
					{clothes}
				</TabsContent>
				<TabsContent value="brands" className="mt-4 flex flex-col">
					{brands}
				</TabsContent>
				<TabsContent value="types" className="mt-4 flex flex-col">
					{types}
				</TabsContent>
			</Tabs>
		</DisplayModeProvider>
	);
}
