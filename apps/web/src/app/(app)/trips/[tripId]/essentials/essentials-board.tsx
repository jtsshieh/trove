'use client';

import { File, HandSoap, Plug } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { Backpack, GripVertical, Layers, Minus, Plus, X } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

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
	EssentialProvision,
	TripEssentialGroup,
} from '@/generated/prisma/client';
import { EssentialKind } from '@/generated/prisma/enums';
import { rankForNeighbors, sortByRank } from '@/lib/dnd/lexorank';
import { useDragBoard, type SortableDrop } from '@/lib/dnd/use-drag-board';
import {
	encodeZone,
	type AcceptPredicate,
	type ItemData,
	type Zone,
} from '@/lib/dnd/zone';
import { cn } from '@/lib/utils';

import {
	resolveEssentialItem,
	type PolymorphicItemRow,
} from '../_data/essential-item';
import type { EssentialItemPickOption } from '../_data/essential-catalog';
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

/** A provision with its polymorphic item resolved (bathroom variant / electronic / document). */
type Provision = EssentialProvision & PolymorphicItemRow;

/** A premade group template, flattened to the item count it would add. */
export interface BoardGroup {
	id: string;
	name: string;
	itemCount: number;
}

/** Identical items in one bucket collapse to a single tile with a ×N count. */
interface Stack {
	rep: Provision;
	count: number;
}

const APP_ORDER: EssentialKind[] = [
	EssentialKind.Bathroom,
	EssentialKind.Document,
	EssentialKind.Electronic,
];

const APP_ICONS: Record<EssentialKind, React.ReactNode> = {
	[EssentialKind.Bathroom]: <HandSoap className="size-1/2 opacity-50" />,
	[EssentialKind.Document]: <File className="size-1/2 opacity-50" />,
	[EssentialKind.Electronic]: <Plug className="size-1/2 opacity-50" />,
};

const APP_LABELS: Record<EssentialKind, string> = {
	[EssentialKind.Bathroom]: 'Bathroom',
	[EssentialKind.Document]: 'Documents',
	[EssentialKind.Electronic]: 'Electronics',
};

/** Group identical provisions (same resolved item) into stacks, ordered by dayOrder. */
function toStacks(provisions: Provision[]): Stack[] {
	const byItem = new Map<string, Provision[]>();
	for (const p of provisions) {
		const { kind, itemId } = resolveEssentialItem(p);
		const key = `${kind}:${itemId}`;
		const list = byItem.get(key) ?? [];
		list.push(p);
		byItem.set(key, list);
	}
	const stacks = [...byItem.values()].map((list) => {
		const sorted = sortByRank(list, (p) => p.dayOrder);
		return { rep: sorted[0], count: sorted.length };
	});
	return sortByRank(stacks, (s) => s.rep.dayOrder);
}

const appZone = (kind: EssentialKind): Zone => ({
	kind: 'essentialApp',
	ownerId: kind,
});
const subgroupZone = (groupId: string): Zone => ({
	kind: 'essentialSubgroup',
	ownerId: groupId,
});

export function EssentialsBoard({
	tripId,
	provisions,
	subGroups,
}: {
	tripId: string;
	provisions: Provision[];
	subGroups: TripEssentialGroup[];
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

	// Each provision resolves to a (kind, itemId); index the kind per provision id so
	// stacking, lane bucketing, and drop-accept all agree on which app a row belongs to.
	const kindByProvision = React.useMemo(() => {
		const map = new Map<string, EssentialKind>();
		for (const p of provisions) map.set(p.id, resolveEssentialItem(p).kind);
		return map;
	}, [provisions]);

	const subGroupsByApp = React.useMemo(() => {
		// A sub-group's app is the kind of the items inside it (sub-groups carry no
		// kind of their own); fall back to its first member, else show it under every
		// app it has members in. In practice an imported template is single-app.
		const map = new Map<EssentialKind, TripEssentialGroup[]>();
		const appOf = new Map<string, EssentialKind>();
		for (const p of provisions) {
			if (p.tripEssentialGroupId && !appOf.has(p.tripEssentialGroupId)) {
				const kind = kindByProvision.get(p.id);
				if (kind) appOf.set(p.tripEssentialGroupId, kind);
			}
		}
		for (const g of subGroups) {
			const kind = appOf.get(g.id) ?? EssentialKind.Bathroom;
			const list = map.get(kind) ?? [];
			list.push(g);
			map.set(kind, list);
		}
		return map;
	}, [subGroups, provisions, kindByProvision]);

	const groupApp = React.useMemo(() => {
		const map = new Map<string, EssentialKind>();
		for (const [kind, groups] of subGroupsByApp)
			for (const g of groups) map.set(g.id, kind);
		return map;
	}, [subGroupsByApp]);

	// A lane / sub-group only accepts essentials from the SAME app (whether the source
	// is free or inside any sub-group of that app), so dnd-kit never highlights or
	// live-sorts a drop across apps. Predicates are cached (stable identity for
	// dnd-kit) and read the latest groupApp via a ref so a source sitting in a
	// sub-group still resolves to its app.
	const groupAppRef = React.useRef(groupApp);
	groupAppRef.current = groupApp;

	/** Resolve a source's app + current sub-group from its zone data. */
	const resolveSource = React.useCallback(
		(source: {
			data?: unknown;
		}): { app: EssentialKind | undefined; groupId: string | null } => {
			const z = (source.data as ItemData | undefined)?.zone;
			if (!z) return { app: undefined, groupId: null };
			if (z.kind === 'essentialSubgroup') {
				return {
					app: groupAppRef.current.get(z.ownerId),
					groupId: z.ownerId,
				};
			}
			// kind 'essentialApp': ownerId IS the EssentialKind and the source is free.
			return { app: z.ownerId as EssentialKind, groupId: null };
		},
		[],
	);

	// FREE app bucket: accepts a source iff it shares this app (source may be free OR
	// in any sub-group of this app).
	const acceptForApp = React.useMemo(() => {
		const cache = new Map<EssentialKind, AcceptPredicate>();
		return (kind: EssentialKind): AcceptPredicate => {
			let predicate = cache.get(kind);
			if (!predicate) {
				predicate = (source) => resolveSource(source).app === kind;
				cache.set(kind, predicate);
			}
			return predicate;
		};
	}, [resolveSource]);

	// SUB-GROUP bucket: accepts a source iff it shares this app AND is not sitting in a
	// DIFFERENT sub-group (source is free here, or already in THIS sub-group) —
	// enforces "free ↔ sub-group OK, sub-group → other sub-group NOT".
	const acceptForSubgroup = React.useMemo(() => {
		const cache = new Map<string, AcceptPredicate>();
		return (groupId: string): AcceptPredicate => {
			let predicate = cache.get(groupId);
			if (!predicate) {
				predicate = (source) => {
					const thisApp = groupAppRef.current.get(groupId);
					const { app, groupId: sourceGroupId } = resolveSource(source);
					if (app !== thisApp) return false;
					return sourceGroupId === null || sourceGroupId === groupId;
				};
				cache.set(groupId, predicate);
			}
			return predicate;
		};
	}, [resolveSource]);

	// Reps (one per item) per bucket, sorted by dayOrder — the controlled groups.
	// Counts come from the per-bucket stacks, keyed by rep id, so a tile's ×N badge and
	// indices line up with these arrays.
	const stacksByZone = React.useMemo(() => {
		const map = new Map<string, Stack[]>();
		for (const kind of APP_ORDER) {
			map.set(
				encodeZone(appZone(kind)),
				toStacks(
					provisions.filter(
						(p) =>
							kindByProvision.get(p.id) === kind &&
							(p.tripEssentialGroupId ?? null) === null,
					),
				),
			);
		}
		for (const g of subGroups) {
			map.set(
				encodeZone(subgroupZone(g.id)),
				toStacks(
					provisions.filter((p) => (p.tripEssentialGroupId ?? null) === g.id),
				),
			);
		}
		return map;
	}, [provisions, subGroups, kindByProvision]);

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
			// Cross-app / cross-subgroup are blocked at the accept level, so the
			// destination is always a valid bucket for this item.
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

	return (
		<DragBoard {...props}>
			<DragAnnouncer />
			<div className="grid gap-4 lg:grid-cols-3">
				{APP_ORDER.map((kind) => (
					<AppLane
						key={kind}
						tripId={tripId}
						kind={kind}
						accept={acceptForApp(kind)}
						acceptSubgroup={acceptForSubgroup}
						free={stacksFor(appZone(kind))}
						subGroups={subGroupsByApp.get(kind) ?? []}
						stacksFor={(groupId) => stacksFor(subgroupZone(groupId))}
					/>
				))}
			</div>
		</DragBoard>
	);
}

function AppLane({
	tripId,
	kind,
	accept,
	acceptSubgroup,
	free,
	subGroups,
	stacksFor,
}: {
	tripId: string;
	kind: EssentialKind;
	accept: AcceptPredicate;
	acceptSubgroup: (groupId: string) => AcceptPredicate;
	free: Stack[];
	subGroups: TripEssentialGroup[];
	stacksFor: (groupId: string) => Stack[];
}) {
	const zone: Zone = { kind: 'essentialApp', ownerId: kind };
	const total =
		free.reduce((n, s) => n + s.count, 0) +
		subGroups.reduce(
			(n, g) => n + stacksFor(g.id).reduce((m, s) => m + s.count, 0),
			0,
		);

	return (
		<section
			data-testid="essential-app-lane"
			data-app={kind}
			className="bg-panel text-panel-foreground flex flex-col gap-2 rounded-xl p-2"
		>
			<header className="flex items-center gap-2 px-2 pt-1">
				<span className="text-muted-foreground flex size-6 items-center justify-center">
					{APP_ICONS[kind]}
				</span>
				<h2 className="flex-1 text-sm font-semibold">{APP_LABELS[kind]}</h2>
				<span className="text-muted-foreground text-xs tabular-nums">
					{total}
				</span>
				<AddSubGroupButton tripId={tripId} />
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
						icon={APP_ICONS[kind]}
						title={`No ${APP_LABELS[kind].toLowerCase()}`}
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
				<div className="border-foreground/10 flex items-center gap-1 border-b px-0.5 pb-1">
					<span className="bg-foreground/8 flex size-5 shrink-0 items-center justify-center rounded">
						<Layers className="size-3.5" />
					</span>
					<SubGroupName group={group} />
					<DeleteSubGroupButton group={group} />
				</div>
				{stacks.length === 0 ? (
					<p className="text-muted-foreground px-1 py-2 text-center text-[0.7rem]">
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
	const item = resolveEssentialItem(rep);

	async function addOne() {
		try {
			await createProvisions.mutateAsync({
				items: [{ kind: item.kind, itemId: item.itemId }],
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
					data-testid="essential-tile"
					data-name={item.name}
					className={cn(
						'flex items-center gap-1 rounded-lg bg-card p-1.5 ring-1 ring-border transition-[opacity,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)]',
						'hover-hover:hover:ring-foreground/15',
						isDragging && 'opacity-50',
						isPending && 'opacity-60',
					)}
				>
					<div
						ref={handleRef}
						aria-hidden
						className="text-muted-foreground hover-hover:hover:bg-muted hover-hover:hover:text-foreground flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md transition-colors duration-[var(--dur-fast)] active:cursor-grabbing"
					>
						<GripVertical className="size-4" />
					</div>
					<ItemDisplay
						name={item.name}
						imageKey={item.imageKey}
						fallbackIcon={APP_ICONS[item.kind]}
						size="panel"
						meta={count > 1 ? `×${count}` : undefined}
						className="min-w-0 flex-1"
					/>
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
							disabled={isPending}
							onClick={addOne}
						>
							<Plus className="size-3.5" />
						</Button>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={`Remove ${item.name}`}
						disabled={isPending}
						onClick={removeOne}
						className="text-muted-foreground hover-hover:hover:text-destructive shrink-0"
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
		void renameGroup.mutateAsync({
			id: group.id,
			input: { name: value.trim() },
		});
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
			className="hover-hover:hover:underline flex-1 truncate text-left text-xs font-semibold"
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
			title="Ungroup (keeps the items in this app)"
			loading={pending}
			onClick={() => void deleteGroup.mutateAsync(group.id)}
			className="text-muted-foreground hover-hover:hover:text-foreground shrink-0"
		>
			{!pending && <X className="size-3.5" />}
		</Button>
	);
}

function AddSubGroupButton({ tripId }: { tripId: string }) {
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
					await createGroup.mutateAsync({ name: 'New group' });
				} catch {
					toast.error('Could not create group');
				}
			}}
			className="text-muted-foreground hover-hover:hover:text-foreground shrink-0"
		>
			{!pending && <Plus className="size-4" />}
		</Button>
	);
}

export function AddEssentials({
	tripId,
	catalog,
}: {
	tripId: string;
	catalog: {
		bathroom: EssentialItemPickOption[];
		electronic: EssentialItemPickOption[];
		document: EssentialItemPickOption[];
	};
}) {
	const [open, setOpen] = React.useState(false);
	const [selected, setSelected] = React.useState<string[]>([]);
	const createProvisions = useCreateEssentialProvisions(tripId);
	const isPending = createProvisions.isPending;

	// One flat lookup so a selected key resolves back to its (kind, itemId) pick.
	const byKey = React.useMemo(() => {
		const map = new Map<string, EssentialItemPickOption>();
		for (const opt of [
			...catalog.bathroom,
			...catalog.electronic,
			...catalog.document,
		])
			map.set(opt.key, opt);
		return map;
	}, [catalog]);

	const isEmpty = byKey.size === 0;

	const groups: MultiSelectGroup<EssentialItemPickOption>[] = React.useMemo(
		() => [
			{ heading: APP_LABELS[EssentialKind.Bathroom], items: catalog.bathroom },
			{ heading: APP_LABELS[EssentialKind.Document], items: catalog.document },
			{
				heading: APP_LABELS[EssentialKind.Electronic],
				items: catalog.electronic,
			},
		],
		[catalog],
	);

	function onOpenChange(next: boolean) {
		setOpen(next);
		if (!next) setSelected([]);
	}

	async function onAdd() {
		if (selected.length === 0) return;
		const items = selected
			.map((key) => byKey.get(key))
			.filter((opt): opt is EssentialItemPickOption => opt !== undefined)
			.map((opt) => ({ kind: opt.kind, itemId: opt.itemId }));
		try {
			await createProvisions.mutateAsync({ items });
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
				{isEmpty ? (
					<EmptyState
						className="border-0 bg-transparent"
						icon={<Backpack />}
						title="Nothing to add yet"
						description="Add bathroom products, electronics, or documents to pack them here."
					/>
				) : (
					<>
						<MultiSelectCommand
							groups={groups}
							getKey={(o) => o.key}
							getLabel={(o) => o.name}
							getImageKey={(o) => o.imageKey}
							value={selected}
							onValueChange={setSelected}
							placeholder="Search items…"
							emptyText="No items found."
							className="max-h-72"
						/>
						<div className="border-border flex items-center justify-between gap-2 border-t p-2">
							<span className="text-muted-foreground pl-1 text-xs">
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

export function AddGroup({
	tripId,
	groups,
}: {
	tripId: string;
	groups: BoardGroup[];
}) {
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
						description="Create essential-group templates to import them."
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
								<span className="text-muted-foreground shrink-0 text-xs tabular-nums">
									{group.itemCount}
								</span>
							</Button>
						))}
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
