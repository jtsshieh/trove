'use client';

import { ImageOff, Loader2, Pencil, Upload, X } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';

import { ImageEditorDialog } from '@/components/image-editor-dialog';
import { Button } from '@/components/ui/button';
import { uploadImageFile } from '@/lib/image-pipeline';
import { imageSrc } from '@/lib/images';
import { cn } from '@/lib/utils';

/**
 * Photo field used by every create/edit form. Uploads immediately; the "Edit"
 * step opens the image editor (crop, erase a hanger/anything, remove background)
 * — available for freshly picked photos and already-stored ones alike.
 */
export function ImageUpload({
	value,
	onChange,
	className,
}: {
	value?: string | null;
	onChange: (key: string | null) => void;
	className?: string;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [file, setFile] = useState<File | null>(null);
	const [busy, setBusy] = useState(false);
	const [editing, setEditing] = useState(false);

	async function uploadFile(toUpload: File) {
		setBusy(true);
		try {
			onChange(await uploadImageFile(toUpload));
		} catch {
			toast.error('Upload failed');
		} finally {
			setBusy(false);
		}
	}

	function onSelect(event: ChangeEvent<HTMLInputElement>) {
		const selected = event.target.files?.[0];
		if (!selected) return;
		setFile(selected);
		void uploadFile(selected);
		event.target.value = '';
	}

	function onEdited(edited: File) {
		setFile(edited);
		void uploadFile(edited);
	}

	const canEdit = !!file || !!value;

	return (
		<div className={cn('flex items-center gap-3', className)}>
			<button
				type="button"
				onClick={() => canEdit && setEditing(true)}
				disabled={!canEdit || busy}
				aria-label={canEdit ? 'Edit photo' : undefined}
				className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground enabled:hover-hover:hover:border-ring"
			>
				{value ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={imageSrc(value)} alt="" className="size-full object-cover" />
				) : (
					<ImageOff className="size-5 opacity-50" />
				)}
				{busy && (
					<div className="absolute inset-0 grid place-content-center bg-background/60">
						<Loader2 className="size-4 animate-spin" />
					</div>
				)}
			</button>
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				capture="environment"
				className="hidden"
				onChange={onSelect}
			/>
			<div className="flex flex-wrap gap-1.5">
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={() => inputRef.current?.click()}
					disabled={busy}
				>
					<Upload /> {value ? 'Replace' : 'Add photo'}
				</Button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					onClick={() => setEditing(true)}
					disabled={!canEdit || busy}
					title="Crop, erase a hanger, or remove the background"
				>
					<Pencil /> Edit
				</Button>
				{value && (
					<Button
						type="button"
						size="icon-sm"
						variant="ghost"
						onClick={() => {
							onChange(null);
							setFile(null);
						}}
						disabled={busy}
					>
						<X />
					</Button>
				)}
			</div>
			<ImageEditorDialog
				open={editing}
				onOpenChange={setEditing}
				file={file}
				src={!file && value ? imageSrc(value) : null}
				onApply={onEdited}
			/>
		</div>
	);
}
