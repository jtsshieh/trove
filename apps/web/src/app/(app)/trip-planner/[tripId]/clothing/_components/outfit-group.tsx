'use client';

import { BookmarkPlus, ChevronDown, GripVertical, X } from 'lucide-react';
import { CoatHanger } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { DropZone } from '@/components/dnd';
import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import type { Zone } from '@/lib/dnd/zone';
import { cn } from '@/lib/utils';

import {
	useDeleteTripOutfit,
	useRenameTripOutfit,
	useSaveTripOutfitAsTemplate,
} from '../_data/mutations';
import type { BoardOutfit } from './types';

/**
 * A TripOutfit grouping on a day — a brand-tinted drop zone that accepts clothing,
 * with an inline-renameable title and an ungroup action. Collapsible with a
 * transform/opacity expand so a busy day can be tidied. A grip handle lets the
 * whole grouping (with its pieces) be dragged onto another day.
 */
export function OutfitGroup({
	outfit,
	zone,
	count,
	grid,
	dragRef,
	handleRef,
	isDragging,
	className,
	children,
}: {
	outfit: BoardOutfit;
	zone: Zone;
	count: number;
	/** Calendar view: flow pieces as image-forward tiles instead of a stack. */
	grid?: boolean;
	/** dnd refs from the wrapping Sortable: the card drags to reorder/move the outfit. */
	dragRef?: (node: HTMLElement | null) => void;
	handleRef?: (node: Element | null) => void;
	isDragging?: boolean;
	/** Extra classes on the root (e.g. col-span-full so it spans a piece grid row). */
	className?: string;
	children: ReactNode;
}) {
	const [expanded, setExpanded] = useState(true);

	return (
		<div
			ref={dragRef}
			data-testid="outfit-group"
			data-outfit-id={outfit.id}
			className={cn(isDragging && 'opacity-50', className)}
		>
			<DropZone
				zone={zone}
				accepts={['clothing']}
				className="ring-foreground/10 bg-surface-sunken data-[drop-target]:bg-brand-subtle rounded-xl p-1.5 ring-1 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]"
			>
				<div className="border-foreground/10 mb-1 flex items-center gap-1 border-b px-0.5 pb-1">
					<span
						ref={handleRef}
						data-testid="outfit-grip"
						aria-label={`Reorder ${outfit.name ?? 'outfit'}`}
						className="text-muted-foreground/50 hover-hover:hover:text-muted-foreground -ml-0.5 flex shrink-0 cursor-grab touch-none items-center transition-[color,opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:cursor-grabbing"
					>
						<GripVertical className="size-3.5" />
					</span>
					<button
						type="button"
						onClick={() => setExpanded((v) => !v)}
						aria-expanded={expanded}
						className="text-foreground flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-0.5 text-left text-xs font-semibold outline-none"
					>
						<span className="bg-foreground/8 flex size-5 shrink-0 items-center justify-center rounded">
							<CoatHanger className="size-3.5" weight="bold" />
						</span>
						<OutfitName outfit={outfit} />
						<ChevronDown
							className={cn(
								'size-3.5 shrink-0 text-muted-foreground transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out)]',
								!expanded && '-rotate-90',
							)}
						/>
					</button>
					<SaveAsTemplateButton
						tripId={outfit.tripId}
						tripOutfitId={outfit.id}
						name={outfit.name}
						disabled={count === 0}
					/>
					<UngroupButton
						tripId={outfit.tripId}
						tripOutfitId={outfit.id}
						name={outfit.name}
					/>
				</div>
				{/* Pure-CSS height collapse (grid 0fr↔1fr) — avoids AnimatePresence's
			    exit/removeChild reconciliation issues with React 19. */}
				<div
					className={cn(
						'ease-[var(--ease-out)] grid transition-[grid-template-rows,opacity] duration-[var(--dur-popover)]',
						expanded
							? 'grid-rows-[1fr] opacity-100'
							: 'grid-rows-[0fr] opacity-0',
					)}
				>
					<div className="min-h-0 overflow-hidden">
						<div
							className={cn(
								'pt-1',
								grid
									? 'grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-1.5'
									: 'flex flex-col gap-1',
							)}
						>
							{count === 0 ? (
								<p
									className={cn(
										'text-brand/60 px-1 py-2 text-center text-[0.7rem]',
										grid && 'col-span-full',
									)}
								>
									Drop pieces here
								</p>
							) : (
								children
							)}
						</div>
					</div>
				</div>
			</DropZone>
		</div>
	);
}

function OutfitName({ outfit }: { outfit: BoardOutfit }) {
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState(outfit.name ?? '');
	const renameOutfit = useRenameTripOutfit(outfit.tripId);
	const label = outfit.name ?? 'Outfit';

	function commit() {
		setEditing(false);
		if (value.trim() === (outfit.name ?? '').trim()) return;
		void renameOutfit.mutateAsync({ id: outfit.id, name: value.trim() });
	}

	if (editing) {
		return (
			<input
				autoFocus
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onBlur={commit}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => {
					if (e.key === 'Enter') commit();
					if (e.key === 'Escape') {
						setValue(outfit.name ?? '');
						setEditing(false);
					}
				}}
				placeholder="Outfit name"
				className="bg-card text-foreground ring-ring-brand placeholder:text-muted-foreground min-w-0 flex-1 rounded px-1 py-0.5 text-xs font-semibold ring-1 outline-none placeholder:font-normal"
			/>
		);
	}

	return (
		<span
			role="textbox"
			tabIndex={-1}
			onClick={(e) => {
				e.stopPropagation();
				setEditing(true);
			}}
			className="hover-hover:hover:underline truncate decoration-dotted underline-offset-2"
			title="Rename outfit"
		>
			{label}
		</span>
	);
}

/** Snapshot the day's grouping into a reusable Outfit template (name → save). */
function SaveAsTemplateButton({
	tripId,
	tripOutfitId,
	name,
	disabled,
}: {
	tripId: string;
	tripOutfitId: string;
	name: string | null;
	disabled: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [value, setValue] = useState(name ?? '');
	const saveAsTemplate = useSaveTripOutfitAsTemplate(tripId);

	async function save() {
		const trimmed = value.trim();
		if (!trimmed) return;
		try {
			const res = await saveAsTemplate.mutateAsync({
				id: tripOutfitId,
				name: trimmed,
			});
			if (res.type === 'success') {
				toast.success(res.message);
				setOpen(false);
			} else if (res.type === 'error') {
				toast.error(res.message);
			}
		} catch {
			// onError toast already fired.
		}
	}

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) setValue(name ?? '');
			}}
		>
			<PopoverTrigger
				render={
					<Button
						size="icon-xs"
						variant="ghost"
						disabled={disabled}
						aria-label={`Save ${name ?? 'outfit'} as a reusable outfit`}
						title="Save as outfit"
						className="text-brand/60 hover:text-brand shrink-0"
					/>
				}
			>
				<BookmarkPlus />
			</PopoverTrigger>
			<PopoverContent className="w-64" align="end">
				<PopoverHeader>
					<PopoverTitle>Save as outfit</PopoverTitle>
				</PopoverHeader>
				<p className="text-muted-foreground text-sm">
					Save these pieces as a reusable outfit you can drop onto other days.
				</p>
				<Input
					autoFocus
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') save();
					}}
					placeholder="Outfit name"
					aria-label="Outfit name"
				/>
				<div className="flex justify-end gap-2">
					<Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button
						size="sm"
						variant="brand"
						loading={saveAsTemplate.isPending}
						disabled={!value.trim()}
						onClick={save}
					>
						Save
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}

function UngroupButton({
	tripId,
	tripOutfitId,
	name,
}: {
	tripId: string;
	tripOutfitId: string;
	name: string | null;
}) {
	const deleteOutfit = useDeleteTripOutfit(tripId);
	return (
		<Button
			size="icon-xs"
			variant="ghost"
			aria-label={`Ungroup ${name ?? 'outfit'}`}
			title="Ungroup (keeps the pieces on the day)"
			loading={deleteOutfit.isPending}
			onClick={() => {
				void deleteOutfit.mutateAsync(tripOutfitId);
			}}
			className="text-brand/60 hover:text-brand shrink-0"
		>
			{!deleteOutfit.isPending && <X />}
		</Button>
	);
}
