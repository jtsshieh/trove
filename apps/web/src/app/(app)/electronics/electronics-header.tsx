'use client';

import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

import { BulkAddElectronicsDialog } from './bulk-add-electronics-dialog';
import { CreateElectronicDialog } from './electronic-dialogs';
import { ElectronicsListContent } from './page-wrapper';

/**
 * The title block + the Bulk add and Add buttons (the Add button needs the brand
 * picker, so it streams behind a Suspense skeleton), then the list content.
 */
export function ElectronicsHeader() {
	return (
		<>
			<div className="mb-4 flex items-center justify-between gap-4 border-b pb-4">
				<div className="flex flex-col gap-1">
					<h1 className="text-3xl font-bold">Electronics</h1>
					<h2 className="text-base text-neutral-600">
						Your devices, cables, power banks, and accessories.
					</h2>
				</div>
				<div className="flex items-center gap-2">
					<BulkAddElectronicsDialog />
					<Suspense fallback={<Skeleton className="size-9 sm:h-10 sm:w-40" />}>
						<CreateElectronicDialog />
					</Suspense>
				</div>
			</div>
			<ElectronicsListContent />
		</>
	);
}
