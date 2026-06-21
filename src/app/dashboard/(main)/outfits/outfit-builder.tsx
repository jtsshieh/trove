'use client';

import type { Clothing, Trip } from '@/generated/prisma/client';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import {
	CalendarPlus,
	GripVertical,
	MoreHorizontal,
	Pencil,
	Plus,
	Shirt,
	Trash,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { DragAnnouncer, DragBoard, DropZone, Sortable } from '@/components/dnd';
import { DisplayToggle } from '@/components/display-mode';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { rankForNeighbors, sortByRank } from '@/lib/dnd/lexorank';
import { useDragBoard, type SortableDrop } from '@/lib/dnd/use-drag-board';
import { encodeZone, type Zone } from '@/lib/dnd/zone';
import { cn } from '@/lib/utils';

import { reorderOutfit } from './_data/api';
import type { OutfitWithItems } from './_data/fetchers';
import { outfitsQueryOptions } from './_data/queries';
import { useRegisterOutfitCreate } from './outfit-actions-context';
import { AssignToDaysDialog } from './_components/assign-to-days-dialog';
import { DeleteOutfitDialog } from './_components/delete-outfit-dialog';
import { OutfitEditorDialog } from './_components/outfit-editor-dialog';
import { OutfitMontage } from './_components/outfit-montage';

// The library is one self-contained ordered scope; this zone only groups the
// sortables (no cross-zone moves), so a stable synthetic identity is enough.
const LIBRARY_ZONE: Zone = { kind: 'closet', ownerId: 'outfit-library' };

/** One controlled group; array order = display order. */
function buildGroups(
	outfits: OutfitWithItems[],
): Record<string, OutfitWithItems[]> {
	return {
		[encodeZone(LIBRARY_ZONE)]: sortByRank(outfits, (o) => o.order),
	};
}

export function OutfitBuilder({
	wardrobe,
	trips,
	chromeless = false,
}: {
	wardrobe: Clothing[];
	trips: Trip[];
	/** When true, hides the built-in header; the New outfit trigger lives in the
	 * wardrobe tab bar and drives create through the outfit actions context. */
	chromeless?: boolean;
}) {
	const queryClient = useQueryClient();
	const { data: initialOutfits } = useSuspenseQuery(outfitsQueryOptions);

	const [editorOpen, setEditorOpen] = useState(false);
	const [editing, setEditing] = useState<OutfitWithItems | null>(null);
	const [assigning, setAssigning] = useState<OutfitWithItems | null>(null);
	const [deleting, setDeleting] = useState<OutfitWithItems | null>(null);

	// Reorder is the only persisted op (single zone). Compute the rank from the
	// outfit's final neighbours, persist, then re-sync.
	const onSortableDrop = useCallback(
		(drop: SortableDrop<OutfitWithItems>) => {
			if (!drop.sameZone) return;
			const order = rankForNeighbors(drop.destItems, drop.index, (o) => o.order);
			void (async () => {
				try {
					await reorderOutfit(drop.id, order);
					toast.success('Reordered');
				} catch {
					toast.error('Could not reorder');
				} finally {
					await queryClient.invalidateQueries({
						queryKey: outfitsQueryOptions.queryKey,
					});
				}
			})();
		},
		[queryClient],
	);

	const { groups, props } = useDragBoard<OutfitWithItems>({
		groups: () => buildGroups(initialOutfits),
		deps: [initialOutfits],
		onSortableDrop,
	});

	const ordered = groups[encodeZone(LIBRARY_ZONE)] ?? [];

	function openCreate() {
		setEditing(null);
		setEditorOpen(true);
	}

	// When chromeless, the New outfit trigger lives in the wardrobe tab bar.
	useRegisterOutfitCreate(openCreate);

	function openEdit(outfit: OutfitWithItems) {
		setEditing(outfit);
		setEditorOpen(true);
	}

	return (
		<>
			{!chromeless && (
				<header className="mb-4 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
					<div className="min-w-0 flex-1">
						<h1 className="text-2xl font-bold sm:text-3xl">Outfits</h1>
						<h2 className="text-sm text-muted-foreground sm:text-base">
							Reusable looks you can drop onto any trip day.
						</h2>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<DisplayToggle />
						<Button variant="brand" onClick={openCreate}>
							<Plus />
							New outfit
						</Button>
					</div>
				</header>
			)}

			{ordered.length === 0 ? (
				<EmptyState
					icon={<Shirt />}
					title="No outfits yet"
					description="Build a look from your wardrobe and reuse it across trips."
					action={
						<Button variant="brand" onClick={openCreate}>
							<Plus />
							New outfit
						</Button>
					}
					className="flex-1"
				/>
			) : (
				<DragBoard {...props}>
					<DragAnnouncer />
					<DropZone
						zone={LIBRARY_ZONE}
						accepts={['clothing']}
						className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
					>
						{ordered.map((outfit, index) => (
							<Sortable
								key={outfit.id}
								id={outfit.id}
								index={index}
								type="clothing"
								zone={LIBRARY_ZONE}
								accept={['clothing']}
							>
								{({ ref, handleRef, isDragging }) => (
									<OutfitCard
										ref={ref}
										handleRef={handleRef}
										isDragging={isDragging}
										outfit={outfit}
										onEdit={() => openEdit(outfit)}
										onAssign={() => setAssigning(outfit)}
										onDelete={() => setDeleting(outfit)}
									/>
								)}
							</Sortable>
						))}
					</DropZone>
				</DragBoard>
			)}

			<OutfitEditorDialog
				open={editorOpen}
				onOpenChange={setEditorOpen}
				outfit={editing ?? undefined}
				wardrobe={wardrobe}
			/>
			{assigning && (
				<AssignToDaysDialog
					open
					onOpenChange={(open) => !open && setAssigning(null)}
					outfit={assigning}
					trips={trips}
				/>
			)}
			{deleting && (
				<DeleteOutfitDialog
					open
					onOpenChange={(open) => !open && setDeleting(null)}
					outfit={deleting}
				/>
			)}
		</>
	);
}

function OutfitCard({
	ref,
	handleRef,
	isDragging,
	outfit,
	onEdit,
	onAssign,
	onDelete,
}: {
	ref: (node: HTMLElement | null) => void;
	handleRef: (node: Element | null) => void;
	isDragging: boolean;
	outfit: OutfitWithItems;
	onEdit: () => void;
	onAssign: () => void;
	onDelete: () => void;
}) {
	const pieceCount = outfit.items.length;

	return (
		<div
			ref={ref}
			className={cn(
				'group/outfit relative flex flex-col overflow-hidden rounded-xl bg-card text-left ring-1 ring-foreground/10 transition-[box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover-hover:hover:ring-foreground/20',
				isDragging && 'opacity-50',
			)}
		>
			<button
				type="button"
				onClick={onEdit}
				className="focus-visible:ring-ring-brand flex flex-1 flex-col text-left outline-none focus-visible:ring-2"
				aria-label={`Edit ${outfit.name}`}
			>
				<OutfitMontage outfit={outfit} className="aspect-square w-full" />
				<div className="flex flex-col gap-0.5 p-2.5">
					<span className="truncate text-sm font-medium">{outfit.name}</span>
					<span className="text-muted-foreground text-xs">
						{pieceCount} {pieceCount === 1 ? 'piece' : 'pieces'}
					</span>
				</div>
			</button>

			{/* Drag handle — appears on hover/focus, never competes with the cover. */}
			<button
				ref={handleRef}
				type="button"
				aria-label={`Reorder ${outfit.name}`}
				className="bg-card/80 text-muted-foreground ring-foreground/10 hover-hover:group-hover/outfit:opacity-100 focus-visible:ring-ring-brand absolute top-2 left-2 grid size-7 cursor-grab touch-none place-content-center rounded-md opacity-0 ring-1 backdrop-blur-sm transition-opacity duration-[var(--dur-fast)] ease-[var(--ease-out)] focus-visible:opacity-100 focus-visible:ring-2 active:cursor-grabbing"
			>
				<GripVertical className="size-4" />
			</button>

			<div className="hover-hover:group-hover/outfit:opacity-100 absolute top-2 right-2 opacity-0 transition-opacity duration-[var(--dur-fast)] ease-[var(--ease-out)] focus-within:opacity-100 has-data-[popup-open]:opacity-100">
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								variant="ghost"
								size="icon-sm"
								className="bg-card/80 ring-foreground/10 ring-1 backdrop-blur-sm"
								aria-label={`${outfit.name} actions`}
							/>
						}
					>
						<MoreHorizontal />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={onAssign}>
							<CalendarPlus />
							Add to a trip
						</DropdownMenuItem>
						<DropdownMenuItem onClick={onEdit}>
							<Pencil />
							Edit
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem variant="destructive" onClick={onDelete}>
							<Trash />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
