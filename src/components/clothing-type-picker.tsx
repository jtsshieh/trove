'use client';

import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

import { ClothingCategory } from '@/generated/prisma/enums';

export interface PickerType {
	name: string;
	category: ClothingCategory;
}

/**
 * Two-column transfer list for curating the global clothing-type catalog. Left =
 * "Keep" (will exist), right = "Don't include". Per-item arrows move between
 * columns; a row adds a custom type. Controlled by the parent (setup keeps local
 * state; admin syncs each move with the server).
 */
export function ClothingTypePicker({
	keep,
	exclude,
	onMoveToExclude,
	onMoveToKeep,
	onAdd,
	lockedKeep,
	busy,
}: {
	keep: PickerType[];
	exclude: PickerType[];
	onMoveToExclude: (name: string) => void;
	onMoveToKeep: (name: string) => void;
	onAdd: (type: PickerType) => void;
	/** Names that can't be moved out of Keep (e.g. in use). */
	lockedKeep?: (name: string) => boolean;
	busy?: boolean;
}) {
	const [name, setName] = useState('');
	const [category, setCategory] = useState<ClothingCategory>(
		ClothingCategory.Top,
	);

	const add = () => {
		const trimmed = name.trim();
		if (!trimmed) return;
		onAdd({ name: trimmed, category });
		setName('');
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-3">
				<Column
					title="Keep"
					items={keep}
					direction="out"
					onMove={onMoveToExclude}
					locked={lockedKeep}
					busy={busy}
				/>
				<Column
					title="Don't include"
					items={exclude}
					direction="in"
					onMove={onMoveToKeep}
					busy={busy}
				/>
			</div>
			<div className="flex items-end gap-2 border-t pt-4">
				<div className="flex flex-1 flex-col gap-1">
					<label className="text-sm font-medium">Add a custom type</label>
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. Raincoat"
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								add();
							}
						}}
					/>
				</div>
				<select
					aria-label="Category"
					className="h-9 rounded-md border px-2 text-sm"
					value={category}
					onChange={(e) => setCategory(e.target.value as ClothingCategory)}
				>
					{Object.values(ClothingCategory).map((c) => (
						<option key={c} value={c}>
							{c}
						</option>
					))}
				</select>
				<Button type="button" onClick={add} disabled={!name.trim() || busy}>
					<Plus className="size-4" /> Add
				</Button>
			</div>
		</div>
	);
}

function Column({
	title,
	items,
	direction,
	onMove,
	locked,
	busy,
}: {
	title: string;
	items: PickerType[];
	direction: 'in' | 'out';
	onMove: (name: string) => void;
	locked?: (name: string) => boolean;
	busy?: boolean;
}) {
	const groups = Object.values(ClothingCategory)
		.map((cat) => ({ cat, list: items.filter((i) => i.category === cat) }))
		.filter((g) => g.list.length > 0);

	return (
		<div className="rounded-md border">
			<div className="border-b bg-neutral-50 px-3 py-2 text-sm font-semibold">
				{title} ({items.length})
			</div>
			<ScrollArea className="h-72">
				<div className="flex flex-col gap-3 p-3">
					{groups.length === 0 && (
						<div className="text-xs text-neutral-400">Nothing here.</div>
					)}
					{groups.map(({ cat, list }) => (
						<div key={cat}>
							<div className="mb-1 text-xs font-medium text-neutral-500">
								{cat}
							</div>
							<div className="flex flex-col gap-1">
								{list.map((item) => {
									const isLocked = direction === 'out' && !!locked?.(item.name);
									return (
										<div
											key={item.name}
											className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-neutral-100"
										>
											<span>{item.name}</span>
											<Button
												variant="ghost"
												size="icon"
												className="size-7"
												disabled={busy || isLocked}
												title={isLocked ? 'In use — cannot remove' : undefined}
												onClick={() => onMove(item.name)}
											>
												{direction === 'out' ? (
													<ArrowRight className="size-4" />
												) : (
													<ArrowLeft className="size-4" />
												)}
											</Button>
										</div>
									);
								})}
							</div>
						</div>
					))}
				</div>
			</ScrollArea>
		</div>
	);
}
