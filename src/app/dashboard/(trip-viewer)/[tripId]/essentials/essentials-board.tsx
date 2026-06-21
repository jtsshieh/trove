'use client';

import { File, HandSoap, Plug } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { Backpack, GripVertical, Layers, Minus, Plus, X } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

import { DisplayToggle } from '@/components/display-mode';
import { DragAnnouncer, DragBoard, DropZone, Sortable } from '@/components/dnd';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { ItemDisplay } from '@/components/ui/item-display';
import {
	MultiSelectCommand,
	type MultiSelectGroup,
} from '@/components/ui/multi-select-command';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import type {
	Essential,
	EssentialProvision,
	TripEssentialGroup,
} from '@/generated/prisma/client';
import { EssentialCategory } from '@/generated/prisma/enums';
import { rankForNeighbors, sortByRank } from '@/lib/dnd/lexorank';
import { useDragBoard, type SortableDrop } from '@/lib/dnd/use-drag-board';
import { encodeZone, type AcceptPredicate, type ItemData, type Zone } from '@/lib/dnd/zone';
import { cn } from '@/lib/utils';

import { TripPageHeader } from '../_components/trip-page-header';
import {
	changeEssentialProvisionDayOrder,
	moveEssentialProvision,
} from './_data/api';
import {
	useCreateEssentialProvisions,
	useCreateTripEssentialGroup,
	useDeleteEssentialProvision,
	useDeleteTripEssentialGroup,
	useImportEssentialGroup,
	useRenameTripEssentialGroup,
} from './_data/mutations';
import { essentialsBoardKeys } from './_data/queries';

type Provision = EssentialProvision & { essential: Essential };

/** A premade essential group, flattened to the ids it would add. */
export interface BoardGroup {
	id: string;
	name: string;
	essentialIds: string[];
}

/** Identical essentials in one bucket collapse to a single tile with a ×N count. */
interface Stack {
	rep: Provision;
	count: number;
}

const CATEGORY_ORDER: EssentialCategory[] = [
	EssentialCategory.Toiletry,
	EssentialCategory.Document,
	EssentialCategory.Electronic,
];

const CATEGORY_ICONS: Record<EssentialCategory, React.ReactNode> = {
	[EssentialCategory.Toiletry]: <HandSoap className="size-1/2 opacity-50" />,
	[EssentialCategory.Document]: <File className="size-1/2 opacity-50" />,
	[EssentialCategory.Electronic]: <Plug className="size-1/2 opacity-50" />,
};

const CATEGORY_LABELS: Record<EssentialCategory, string> = {
	[EssentialCategory.Toiletry]: 'Toiletries',
	[EssentialCategory.Document]: 'Documents',
	[EssentialCategory.Electronic]: 'Electronics',
};

function toStacks(provisions: Provision[]): Stack[] {
	const byEssential = new Map<string, Provision[]>();
	for (const p of provisions) {
		const list = byEssential.get(p.essentialId) ?? [];
		list.push(p);
		byEssential.set(p.essentialId, list);
	}
	const stacks = [...byEssential.values()].map((list) => {
		const sorted = sortByRank(list, (p) => p.dayOrder);
		return { rep: sorted[0], count: sorted.length };
	});
	return sortByRank(stacks, (s) => s.rep.dayOrder);
}

const categoryZone = (category: EssentialCategory): Zone => ({
	kind: 'essentialCategory',
	ownerId: category,
});
const subgroupZone = (groupId: string): Zone => ({
	kind: 'essentialSubgroup',
	ownerId: groupId,
});

export function EssentialsBoard({
	tripId,
	provisions,
	subGroups,
	closet,
	groups,
}: {
	tripId: string;
	provisions: Provision[];
	subGroups: TripEssentialGroup[];
	closet: Essential[];
	groups: BoardGroup[];
}) {
	const queryClient = useQueryClient();
	const invalidateBoard = React.useCallback(
		() =>
			queryClient.invalidateQueries({
				queryKey: essentialsBoardKeys.board(tripId),
			}),
		[queryClient, tripId],
	);

	// Persist a write, then re-sync from the server (the refetch reverts a rejected
	// move and reconciles the optimistic order). `invalidate` runs whether the call
	// succeeds or fails, so a failure rolls the optimistic UI back to server truth.
	const persist = React.useCallback(
		async (call: () => Promise<unknown>, ok: string, fail: string) => {
			try {
				await call();
				toast.success(ok);
			} catch {
				toast.error(fail);
			} finally {
				await invalidateBoard();
			}
		},
		[invalidateBoard],
	);

	const subGroupsByCategory = React.useMemo(() => {
		const map = new Map<EssentialCategory, TripEssentialGroup[]>();
		for (const g of subGroups) {
			const list = map.get(g.category) ?? [];
			list.push(g);
			map.set(g.category, list);
		}
		return map;
	}, [subGroups]);

	const groupCategory = React.useMemo(
		() => new Map(subGroups.map((g) => [g.id, g.category])),
		[subGroups],
	);

	// A lane / sub-group only accepts essentials from the SAME category (whether the
	// source is free or inside any sub-group of that category), so dnd-kit never
	// highlights or live-sorts a drop across categories. Predicates are cached per
	// category (stable identity for dnd-kit) and read the latest groupCategory via a
	// ref so a source sitting in a sub-group still resolves to its category.
	const groupCategoryRef = React.useRef(groupCategory);
	groupCategoryRef.current = groupCategory;

	/** Resolve a source's category + current sub-group from its zone data. */
	const resolveSource = React.useCallback(
		(source: {
			data?: unknown;
		}): { category: EssentialCategory | undefined; groupId: string | null } => {
			const z = (source.data as ItemData | undefined)?.zone;
			if (!z) return { category: undefined, groupId: null };
			if (z.kind === 'essentialSubgroup') {
				return {
					category: groupCategoryRef.current.get(z.ownerId),
					groupId: z.ownerId,
				};
			}
			// kind 'essentialCategory': ownerId IS the category and the source is free.
			return { category: z.ownerId as EssentialCategory, groupId: null };
		},
		[],
	);

	// FREE category bucket: accepts a source iff it shares this category (source may
	// be free OR in any sub-group of this category). [the existing acceptForCategory]
	const acceptForCategory = React.useMemo(() => {
		const cache = new Map<EssentialCategory, AcceptPredicate>();
		return (category: EssentialCategory): AcceptPredicate => {
			let predicate = cache.get(category);
			if (!predicate) {
				predicate = (source) => resolveSource(source).category === category;
				cache.set(category, predicate);
			}
			return predicate;
		};
	}, [resolveSource]);

	// SUB-GROUP bucket: accepts a source iff it shares this category AND is not
	// sitting in a DIFFERENT sub-group (source is free here, or already in THIS
	// sub-group) — enforces "free ↔ sub-group OK, sub-group → other sub-group NOT".
	const acceptForSubgroup = React.useMemo(() => {
		const cache = new Map<string, AcceptPredicate>();
		return (groupId: string): AcceptPredicate => {
			let predicate = cache.get(groupId);
			if (!predicate) {
				predicate = (source) => {
					const thisCategory = groupCategoryRef.current.get(groupId);
					const { category, groupId: sourceGroupId } = resolveSource(source);
					if (category !== thisCategory) return false;
					return sourceGroupId === null || sourceGroupId === groupId;
				};
				cache.set(groupId, predicate);
			}
			return predicate;
		};
	}, [resolveSource]);

	// Reps (one per essential) per bucket, sorted by dayOrder — the controlled
	// groups. Counts come from the per-bucket stacks, keyed by rep id, so a tile's
	// ×N badge and indices line up with these arrays.
	const stacksByZone = React.useMemo(() => {
		const map = new Map<string, Stack[]>();
		for (const category of CATEGORY_ORDER) {
			map.set(
				encodeZone(categoryZone(category)),
				toStacks(
					provisions.filter(
						(p) =>
							p.essential.category === category &&
							(p.tripEssentialGroupId ?? null) === null,
					),
				),
			);
		}
		for (const g of subGroups) {
			map.set(
				encodeZone(subgroupZone(g.id)),
				toStacks(
					provisions.filter(
						(p) => (p.tripEssentialGroupId ?? null) === g.id,
					),
				),
			);
		}
		return map;
	}, [provisions, subGroups]);

	const countById = React.useMemo(() => {
		const map = new Map<string, number>();
		for (const stacks of stacksByZone.values())
			for (const s of stacks) map.set(s.rep.id, s.count);
		return map;
	}, [stacksByZone]);

	const buildGroups = React.useCallback(() => {
		const out: Record<string, Provision[]> = {};
		for (const [key, stacks] of stacksByZone)
			out[key] = stacks.map((s) => s.rep);
		return out;
	}, [stacksByZone]);

	const onSortableDrop = React.useCallback(
		(drop: SortableDrop<Provision>) => {
			const { id, toZone, destItems, index, sameZone } = drop;
			const rank = rankForNeighbors(destItems, index, (p) => p.dayOrder);
			if (sameZone) {
				void persist(
					() => changeEssentialProvisionDayOrder(id, rank),
					'Reordered',
					'Could not reorder essential',
				);
				return;
			}
			// Cross-category / cross-subgroup are blocked at the accept level, so the
			// destination is always a valid bucket for this essential.
			const destGroupId =
				toZone.kind === 'essentialSubgroup' ? toZone.ownerId : null;
			void persist(
				() =>
					moveEssentialProvision(id, {
						tripEssentialGroupId: destGroupId,
						dayOrder: rank,
					}),
				'Moved',
				'Could not move essential',
			);
		},
		[persist],
	);

	const { groups: boardGroups, props } = useDragBoard<Provision>({
		groups: buildGroups,
		deps: [provisions, subGroups],
		onSortableDrop,
	});

	const stacksFor = React.useCallback(
		(zone: Zone): Stack[] =>
			(boardGroups[encodeZone(zone)] ?? []).map((rep) => ({
				rep,
				count: countById.get(rep.id) ?? 1,
			})),
		[boardGroups, countById],
	);

	const usedKeys = new Set(
		// An essential is "fully used" only once every owned unit is provisioned.
		closet
			.filter(
				(e) =>
					provisions.filter((p) => p.essentialId === e.id).length >= e.quantity,
			)
			.map((e) => e.id),
	);

	return (
		<>
			<TripPageHeader
				icon={<Backpack />}
				title="Essentials"
				description="Grouped by type. Drop items into a sub-group, or import a premade group."
				actions={
					<div className="flex items-center gap-2">
						<AddGroup tripId={tripId} groups={groups} />
						<AddEssentials tripId={tripId} closet={closet} usedKeys={usedKeys} />
						<DisplayToggle />
					</div>
				}
			/>
			<DragBoard {...props}>
				<DragAnnouncer />
				<div className="grid gap-4 lg:grid-cols-3">
					{CATEGORY_ORDER.map((category) => (
						<CategoryLane
							key={category}
							tripId={tripId}
							category={category}
							accept={acceptForCategory(category)}
							acceptSubgroup={acceptForSubgroup}
							free={stacksFor(categoryZone(category))}
							subGroups={subGroupsByCategory.get(category) ?? []}
							stacksFor={(groupId) => stacksFor(subgroupZone(groupId))}
						/>
					))}
				</div>
			</DragBoard>
		</>
	);
}

function CategoryLane({
	tripId,
	category,
	accept,
	acceptSubgroup,
	free,
	subGroups,
	stacksFor,
}: {
	tripId: string;
	category: EssentialCategory;
	accept: AcceptPredicate;
	acceptSubgroup: (groupId: string) => AcceptPredicate;
	free: Stack[];
	subGroups: TripEssentialGroup[];
	stacksFor: (groupId: string) => Stack[];
}) {
	const zone: Zone = { kind: 'essentialCategory', ownerId: category };
	const total =
		free.reduce((n, s) => n + s.count, 0) +
		subGroups.reduce(
			(n, g) => n + stacksFor(g.id).reduce((m, s) => m + s.count, 0),
			0,
		);

	return (
		<section
			data-testid="category-lane"
			data-category={category}
			className="flex flex-col gap-2 rounded-xl bg-panel p-2 text-panel-foreground"
		>
			<header className="flex items-center gap-2 px-2 pt-1">
				<span className="flex size-6 items-center justify-center text-muted-foreground">
					{CATEGORY_ICONS[category]}
				</span>
				<h2 className="flex-1 text-sm font-semibold">
					{CATEGORY_LABELS[category]}
				</h2>
				<span className="text-xs tabular-nums text-muted-foreground">
					{total}
				</span>
				<AddSubGroupButton tripId={tripId} category={category} />
			</header>

			{subGroups.map((group) => (
				<SubGroup
					key={group.id}
					group={group}
					accept={acceptSubgroup(group.id)}
					stacks={stacksFor(group.id)}
				/>
			))}

			<DropZone
				zone={zone}
				accepts={accept}
				className={cn(
					'flex min-h-12 flex-1 flex-col gap-1.5 rounded-lg p-1 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]',
					'data-[drop-target]:bg-brand-subtle',
				)}
			>
				{free.length === 0 && subGroups.length === 0 ? (
					<EmptyState
						className="flex-1 border-0 bg-transparent"
						icon={CATEGORY_ICONS[category]}
						title={`No ${CATEGORY_LABELS[category].toLowerCase()}`}
						description="Add items above or import a group."
					/>
				) : (
					free.map((stack, index) => (
						<StackTile
							key={stack.rep.id}
							tripId={tripId}
							stack={stack}
							index={index}
							zone={zone}
							accept={accept}
							groupId={null}
						/>
					))
				)}
			</DropZone>
		</section>
	);
}

function SubGroup({
	group,
	accept,
	stacks,
}: {
	group: TripEssentialGroup;
	accept: AcceptPredicate;
	stacks: Stack[];
}) {
	const zone: Zone = { kind: 'essentialSubgroup', ownerId: group.id };

	// The WHOLE card is the drop zone (header + items), so dropping anywhere on a
	// sub-group lands — small sub-groups otherwise had a drop area too thin to hit.
	return (
		<div data-testid="essential-subgroup" data-group-id={group.id}>
			<DropZone
				zone={zone}
				accepts={accept}
				className={cn(
					'ring-foreground/10 bg-surface-sunken flex flex-col gap-1.5 rounded-lg p-1.5 ring-1 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]',
					'data-[drop-target]:bg-brand-subtle',
				)}
			>
				<div className="flex items-center gap-1 border-b border-foreground/10 px-0.5 pb-1">
					<span className="bg-foreground/8 flex size-5 shrink-0 items-center justify-center rounded">
						<Layers className="size-3.5" />
					</span>
					<SubGroupName group={group} />
					<DeleteSubGroupButton group={group} />
				</div>
				{stacks.length === 0 ? (
					<p className="px-1 py-2 text-center text-[0.7rem] text-muted-foreground">
						Drop items here
					</p>
				) : (
					stacks.map((stack, index) => (
						<StackTile
							key={stack.rep.id}
							tripId={group.tripId}
							stack={stack}
							index={index}
							zone={zone}
							accept={accept}
							groupId={group.id}
						/>
					))
				)}
			</DropZone>
		</div>
	);
}

function StackTile({
	tripId,
	stack,
	index,
	zone,
	accept,
	groupId,
}: {
	tripId: string;
	stack: Stack;
	index: number;
	zone: Zone;
	accept: AcceptPredicate;
	groupId: string | null;
}) {
	const createProvisions = useCreateEssentialProvisions(tripId);
	const deleteProvision = useDeleteEssentialProvision(tripId);
	const isPending = createProvisions.isPending || deleteProvision.isPending;
	const { rep, count } = stack;
	const atMax = count >= rep.essential.quantity;

	async function addOne() {
		try {
			await createProvisions.mutateAsync({
				essentialIds: [rep.essentialId],
				tripEssentialGroupId: groupId,
			});
		} catch {
			toast.error('Could not add');
		}
	}

	async function removeOne() {
		try {
			await deleteProvision.mutateAsync(rep.id);
		} catch {
			toast.error('Could not remove');
		}
	}

	return (
		<Sortable
			id={rep.id}
			index={index}
			type="essential"
			zone={zone}
			accept={accept}
		>
			{({ ref, handleRef, isDragging }) => (
				<div
					ref={ref}
					className={cn(
						'flex items-center gap-1 rounded-lg bg-card p-1.5 ring-1 ring-border transition-[opacity,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)]',
						'hover-hover:hover:ring-foreground/15',
						isDragging && 'opacity-50',
						isPending && 'opacity-60',
					)}
				>
					<button
						ref={handleRef}
						type="button"
						aria-label="Reorder essential"
						className="flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors duration-[var(--dur-fast)] outline-none hover-hover:hover:bg-muted hover-hover:hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
					>
						<GripVertical className="size-4" />
					</button>
					<ItemDisplay
						name={rep.essential.name}
						imageKey={rep.essential.imageKey}
						fallbackIcon={CATEGORY_ICONS[rep.essential.category]}
						size="panel"
						meta={rep.essential.quantity > 1 ? `${count} of ${rep.essential.quantity}` : undefined}
						className="min-w-0 flex-1"
					/>
					{rep.essential.quantity > 1 && (
						<div
							className="flex shrink-0 items-center gap-0.5"
							onPointerDown={(e) => e.stopPropagation()}
						>
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								aria-label="Remove one"
								disabled={isPending}
								onClick={removeOne}
							>
								<Minus className="size-3.5" />
							</Button>
							<span
								data-testid="essential-stack-count"
								className="min-w-5 text-center text-xs font-semibold tabular-nums"
							>
								{count}
							</span>
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								aria-label="Add one"
								disabled={isPending || atMax}
								onClick={addOne}
							>
								<Plus className="size-3.5" />
							</Button>
						</div>
					)}
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={`Remove ${rep.essential.name}`}
						disabled={isPending}
						onClick={removeOne}
						className="shrink-0 text-muted-foreground hover-hover:hover:text-destructive"
					>
						<X className="size-4" />
					</Button>
				</div>
			)}
		</Sortable>
	);
}

function SubGroupName({ group }: { group: TripEssentialGroup }) {
	const [editing, setEditing] = React.useState(false);
	const [value, setValue] = React.useState(group.name);
	const renameGroup = useRenameTripEssentialGroup(group.tripId);

	function commit() {
		setEditing(false);
		if (value.trim() === group.name.trim() || !value.trim()) {
			setValue(group.name);
			return;
		}
		void renameGroup.mutateAsync({ id: group.id, input: { name: value.trim() } });
	}

	if (editing) {
		return (
			<Input
				autoFocus
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === 'Enter') commit();
					if (e.key === 'Escape') {
						setValue(group.name);
						setEditing(false);
					}
				}}
				className="h-6 flex-1 px-1 py-0 text-xs font-semibold"
			/>
		);
	}

	return (
		<button
			type="button"
			onClick={() => setEditing(true)}
			className="flex-1 truncate text-left text-xs font-semibold hover-hover:hover:underline"
			title="Rename sub-group"
		>
			{group.name}
		</button>
	);
}

function DeleteSubGroupButton({ group }: { group: TripEssentialGroup }) {
	const deleteGroup = useDeleteTripEssentialGroup(group.tripId);
	const pending = deleteGroup.isPending;
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-xs"
			aria-label={`Ungroup ${group.name}`}
			title="Ungroup (keeps the items in this category)"
			loading={pending}
			onClick={() => void deleteGroup.mutateAsync(group.id)}
			className="shrink-0 text-muted-foreground hover-hover:hover:text-foreground"
		>
			{!pending && <X className="size-3.5" />}
		</Button>
	);
}

function AddSubGroupButton({
	tripId,
	category,
}: {
	tripId: string;
	category: EssentialCategory;
}) {
	const createGroup = useCreateTripEssentialGroup(tripId);
	const pending = createGroup.isPending;
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-xs"
			aria-label="Add a sub-group"
			title="Add a sub-group"
			loading={pending}
			onClick={async () => {
				try {
					await createGroup.mutateAsync({ name: 'New group', category });
				} catch {
					toast.error('Could not create group');
				}
			}}
			className="shrink-0 text-muted-foreground hover-hover:hover:text-foreground"
		>
			{!pending && <Plus className="size-4" />}
		</Button>
	);
}

function AddEssentials({
	tripId,
	closet,
	usedKeys,
}: {
	tripId: string;
	closet: Essential[];
	usedKeys: Set<string>;
}) {
	const [open, setOpen] = React.useState(false);
	const [selected, setSelected] = React.useState<string[]>([]);
	const createProvisions = useCreateEssentialProvisions(tripId);
	const isPending = createProvisions.isPending;

	const groups: MultiSelectGroup<Essential>[] = React.useMemo(
		() =>
			CATEGORY_ORDER.map((category) => ({
				heading: CATEGORY_LABELS[category],
				items: closet.filter((e) => e.category === category),
			})),
		[closet],
	);

	function onOpenChange(next: boolean) {
		setOpen(next);
		if (!next) setSelected([]);
	}

	async function onAdd() {
		if (selected.length === 0) return;
		const essentialIds = selected;
		try {
			await createProvisions.mutateAsync({ essentialIds });
		} catch {
			toast.error('Could not add essentials');
			return;
		}
		setSelected([]);
		setOpen(false);
	}

	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger
				render={
					<Button variant="outline" size="sm">
						<Plus className="size-4" />
						Add
					</Button>
				}
			/>
			<PopoverContent align="end" className="w-80 gap-0 p-0">
				{closet.length === 0 ? (
					<EmptyState
						className="border-0 bg-transparent"
						icon={<Backpack />}
						title="No essentials yet"
						description="Create essentials in your closet to add them here."
					/>
				) : (
					<>
						<MultiSelectCommand
							groups={groups}
							getKey={(e) => e.id}
							getLabel={(e) => e.name}
							getImageKey={(e) => e.imageKey}
							value={selected}
							onValueChange={setSelected}
							disabledKeys={usedKeys}
							placeholder="Search essentials…"
							emptyText="No essentials found."
							className="max-h-72"
						/>
						<div className="flex items-center justify-between gap-2 border-t border-border p-2">
							<span className="pl-1 text-xs text-muted-foreground">
								{selected.length} selected
							</span>
							<Button
								type="button"
								variant="brand"
								size="sm"
								loading={isPending}
								disabled={selected.length === 0}
								onClick={onAdd}
							>
								Add{selected.length > 0 ? ` ${selected.length}` : ''}
							</Button>
						</div>
					</>
				)}
			</PopoverContent>
		</Popover>
	);
}

function AddGroup({ tripId, groups }: { tripId: string; groups: BoardGroup[] }) {
	const [open, setOpen] = React.useState(false);
	const [pendingId, setPendingId] = React.useState<string | null>(null);
	const importGroup_ = useImportEssentialGroup(tripId);

	async function importGroup(group: BoardGroup) {
		setPendingId(group.id);
		let res;
		try {
			res = await importGroup_.mutateAsync({ groupId: group.id });
		} catch {
			setPendingId(null);
			toast.error('Could not import group');
			return;
		}
		setPendingId(null);
		if (res.type === 'warning') {
			toast.warning(res.message);
			return;
		}
		toast.success(`Imported ${group.name}`);
		setOpen(false);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button variant="outline" size="sm">
						<Layers className="size-4" />
						Import group
					</Button>
				}
			/>
			<PopoverContent align="end" className="w-72 p-2">
				{groups.length === 0 ? (
					<EmptyState
						className="border-0 bg-transparent"
						icon={<Layers />}
						title="No groups yet"
						description="Create essential groups in your closet to import them."
					/>
				) : (
					<div className="flex flex-col gap-0.5">
						{groups.map((group) => (
							<Button
								key={group.id}
								type="button"
								variant="ghost"
								loading={pendingId === group.id}
								disabled={pendingId !== null}
								onClick={() => importGroup(group)}
								className="h-auto justify-between gap-2 px-2 py-1.5 text-left font-normal"
							>
								<span className="truncate">{group.name}</span>
								<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
									{group.essentialIds.length}
								</span>
							</Button>
						))}
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
