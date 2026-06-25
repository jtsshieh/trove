import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { getQueryClient } from '@/lib/query-client';

import { getAllDocuments } from './_data/fetchers';
import { documentsQueryOptions } from './_data/queries';
import { BulkAddDocumentsDialog } from './bulk-add-documents-dialog';
import { CreateDocumentDialog } from './document-dialogs';
import { DocumentsListContent } from './page-wrapper';

export default function DocumentsPage() {
	return (
		<div className="flex w-full flex-1 justify-center">
			<div className="flex w-full max-w-screen-2xl flex-1 flex-col">
				<div className="mb-4 flex items-center justify-between gap-4 border-b pb-4">
					<div className="flex flex-col gap-1">
						<h1 className="text-3xl font-bold">Documents</h1>
						<h2 className="text-base text-neutral-600">
							Keep track of the personal documents you carry.
						</h2>
					</div>
					<div className="flex items-center gap-2">
						<BulkAddDocumentsDialog />
						<CreateDocumentDialog />
					</div>
				</div>
				<DocumentsData />
			</div>
		</div>
	);
}

/**
 * Prefetch the documents WITHOUT awaiting — the query client dehydrates the still-
 * pending query, so the list streams to the client via its own Suspense boundary
 * instead of blocking this subtree.
 */
function DocumentsData() {
	const queryClient = getQueryClient();
	void queryClient.prefetchQuery({
		queryKey: documentsQueryOptions.queryKey,
		queryFn: getAllDocuments,
	});

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<Suspense fallback={<DocumentsListSkeleton />}>
				<DocumentsListContent />
			</Suspense>
		</HydrationBoundary>
	);
}

function DocumentsListSkeleton() {
	return (
		<div className="flex flex-col gap-2">
			{Array.from({ length: 6 }).map((_, i) => (
				<Skeleton key={i} className="h-16 w-full rounded-xl" />
			))}
		</div>
	);
}
