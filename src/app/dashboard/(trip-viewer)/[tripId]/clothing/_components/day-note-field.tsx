'use client';

import { NotePencil } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { useUpsertTripDayNote } from '../_data/mutations';

/**
 * An inline, modal-free day note: a quiet single-line affordance that expands to
 * an auto-sizing textarea on click and persists on blur (empty clears it).
 */
export function DayNoteField({
	tripId,
	day,
	note,
}: {
	tripId: string;
	day: Date;
	note: string;
}) {
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState(note);
	const upsertNote = useUpsertTripDayNote(tripId);
	const ref = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		setValue(note);
	}, [note]);

	useEffect(() => {
		if (editing) ref.current?.focus();
	}, [editing]);

	function commit() {
		setEditing(false);
		const next = value.trim();
		if (next === note.trim()) return;
		void upsertNote.mutateAsync({ day, note: next });
	}

	if (editing) {
		return (
			<textarea
				ref={ref}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						commit();
					}
					if (e.key === 'Escape') {
						setValue(note);
						setEditing(false);
					}
				}}
				rows={1}
				placeholder="Add a note…"
				className="bg-brand-subtle/40 text-foreground ring-ring-brand placeholder:text-muted-foreground field-sizing-content w-full resize-none rounded-md px-1.5 py-1 text-xs leading-snug ring-1 outline-none"
			/>
		);
	}

	return (
		<button
			type="button"
			onClick={() => setEditing(true)}
			className={cn(
				'flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-xs leading-snug transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)] outline-none hover-hover:hover:bg-panel focus-visible:bg-panel',
				note ? 'text-muted-foreground' : 'text-muted-foreground/50',
			)}
		>
			<NotePencil className="size-3.5 shrink-0" weight="bold" />
			<span className="truncate">{note || 'Add a note'}</span>
		</button>
	);
}
