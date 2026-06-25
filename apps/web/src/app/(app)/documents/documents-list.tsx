'use client';

import type { Document } from '@/generated/prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, GripVertical } from 'lucide-react';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { DragAnnouncer, DragBoard, DropZone, Sortable } from '@/components/dnd';
import { EmptyList } from '@/components/empty-list';
import { Card } from '@/components/ui/card';
import { acceptSameZone } from '@/lib/dnd/accept';
import { rankForNeighbors, sortByRank } from '@/lib/dnd/lexorank';
import { useDragBoard, type SortableDrop } from '@/lib/dnd/use-drag-board';
import { encodeZone, type Zone } from '@/lib/dnd/zone';
import { cn } from '@/lib/utils';

import { reorderDocument } from './_data/api';
import { documentsKeys } from './_data/queries';
import {
	DeleteDocumentDialog,
	EditDocumentDialog,
} from './document-dialogs';

interface DocumentsListProps {
	documents: Document[];
}

/** All documents live in one ordered zone scoped to the user's list. */
const DOCUMENTS_ZONE: Zone = { kind: 'documents', ownerId: 'documents' };

/** The single controlled group; array order = display order (lexorank). */
function buildGroups(documents: Document[]): Record<string, Document[]> {
	return {
		[encodeZone(DOCUMENTS_ZONE)]: sortByRank(documents, (d) => d.order),
	};
}

export function DocumentsList({ documents }: DocumentsListProps) {
	const queryClient = useQueryClient();
	const invalidate = useCallback(
		() => queryClient.invalidateQueries({ queryKey: documentsKeys.all }),
		[queryClient],
	);

	// Reorder is the only persisted op (single zone, so a drop never crosses zones).
	// Compute the rank from the document's final neighbours, persist, then re-sync.
	const onSortableDrop = useCallback(
		(drop: SortableDrop<Document>) => {
			if (!drop.sameZone) return;
			const order = rankForNeighbors(drop.destItems, drop.index, (d) => d.order);
			// Dropped back in place — no rank change, so skip the write + toast.
			if (drop.destItems[drop.index]?.order === order) return;
			void (async () => {
				try {
					await reorderDocument(drop.id, order);
					toast.success('Reordered');
				} catch {
					toast.error('Could not reorder');
				} finally {
					await invalidate();
				}
			})();
		},
		[invalidate],
	);

	const { groups, props } = useDragBoard<Document>({
		groups: () => buildGroups(documents),
		deps: [documents],
		onSortableDrop,
	});

	if (documents.length === 0)
		return (
			<EmptyList
				main="You have no documents"
				sub="You can create one by clicking the Add Document button in the top right corner."
			/>
		);

	const items = groups[encodeZone(DOCUMENTS_ZONE)] ?? [];

	return (
		<DragBoard {...props}>
			<DragAnnouncer />
			<DropZone
				zone={DOCUMENTS_ZONE}
				accepts={acceptSameZone(DOCUMENTS_ZONE)}
				className="data-[drop-target]:bg-brand-subtle flex flex-col gap-2 rounded-xl p-1 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]"
			>
				{items.map((document, index) => (
					<DocumentRow
						key={document.id}
						document={document}
						index={index}
						zone={DOCUMENTS_ZONE}
					/>
				))}
			</DropZone>
		</DragBoard>
	);
}

function DocumentRow({
	document,
	index,
	zone,
}: {
	document: Document;
	index: number;
	zone: Zone;
}) {
	return (
		<Sortable
			id={document.id}
			index={index}
			type="document"
			zone={zone}
			accept={acceptSameZone(zone)}
		>
			{({ ref, handleRef, isDragging, isDropTarget }) => (
				<div
					ref={(node) => {
						ref(node);
						handleRef(node);
					}}
					data-testid="document-row"
					data-name={document.name}
					aria-label={`Drag ${document.name}`}
					className="cursor-grab select-none active:cursor-grabbing"
				>
					<Card
						className={cn(
							'group/document flex-row items-center gap-3 p-3',
							isDragging && 'opacity-50',
							isDropTarget && 'ring-1 ring-foreground/20',
						)}
					>
						<GripVertical className="text-foreground/40 size-4 shrink-0" />
						<FileText className="text-muted-foreground size-5 shrink-0" />
						<span className="font-heading min-w-0 flex-1 truncate text-sm font-medium">
							{document.name}
						</span>
						<div
							className="flex shrink-0 items-center gap-2"
							onPointerDown={(e) => e.stopPropagation()}
						>
							<EditDocumentDialog document={document} />
							<DeleteDocumentDialog document={document} />
						</div>
					</Card>
				</div>
			)}
		</Sortable>
	);
}
