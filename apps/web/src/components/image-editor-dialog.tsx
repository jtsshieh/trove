'use client';

import { Brush, Crop, Eraser, Loader2, Sparkles, Trash2 } from 'lucide-react';
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type PointerEvent,
} from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { inpaintImage, removeImageBackground } from '@/lib/image-pipeline';

/** A freehand stroke, in natural image-pixel coordinates. */
type Stroke = { points: { x: number; y: number }[]; width: number };
type Rect = { x: number; y: number; w: number; h: number };
type Tool = 'erase' | 'keep' | 'crop';

const PAINT = 'rgba(37, 99, 235, 0.55)'; // translucent blue wash for erase preview
const KEEP_PAINT = 'rgba(34, 197, 94, 0.5)'; // translucent green wash for keep preview

function paintStroke(
	ctx: CanvasRenderingContext2D,
	stroke: Stroke,
	color: string,
) {
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = stroke.width;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	if (stroke.points.length === 1) {
		const p = stroke.points[0];
		ctx.beginPath();
		ctx.arc(p.x, p.y, stroke.width / 2, 0, Math.PI * 2);
		ctx.fill();
		return;
	}
	ctx.beginPath();
	ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
	for (let i = 1; i < stroke.points.length; i++) {
		ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
	}
	ctx.stroke();
}

async function fetchAsFile(src: string): Promise<File> {
	const res = await fetch(src);
	const blob = await res.blob();
	return new File([blob], 'photo.png', { type: blob.type || 'image/png' });
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
}

/** Render strokes white-on-black at the given size → a 1-channel mask PNG. */
async function strokeMask(
	strokes: Stroke[],
	w: number,
	h: number,
): Promise<Blob | undefined> {
	if (strokes.length === 0) return undefined;
	const off = document.createElement('canvas');
	off.width = w;
	off.height = h;
	const ctx = off.getContext('2d');
	if (!ctx) return undefined;
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, w, h);
	for (const stroke of strokes) paintStroke(ctx, stroke, '#fff');
	return (
		(await new Promise<Blob | null>((resolve) =>
			off.toBlob(resolve, 'image/png'),
		)) ?? undefined
	);
}

/** Crop a File to a rect (natural pixels) → a new PNG File. */
async function cropToFile(file: File, rect: Rect): Promise<File | null> {
	const url = URL.createObjectURL(file);
	try {
		const img = await loadImage(url);
		const w = Math.round(rect.w);
		const h = Math.round(rect.h);
		if (w < 8 || h < 8) return null;
		const off = document.createElement('canvas');
		off.width = w;
		off.height = h;
		const ctx = off.getContext('2d');
		if (!ctx) return null;
		ctx.drawImage(img, Math.round(rect.x), Math.round(rect.y), w, h, 0, 0, w, h);
		const blob = await new Promise<Blob | null>((resolve) =>
			off.toBlob(resolve, 'image/png'),
		);
		return blob ? new File([blob], 'crop.png', { type: 'image/png' }) : null;
	} finally {
		URL.revokeObjectURL(url);
	}
}

/**
 * One non-destructive editor for any item photo. Every tool composes on top of an
 * opaque `base` image without ruining the others:
 *  • Crop changes the base geometry.
 *  • Erase (LaMa inpaint) edits the base content — always run on the OPAQUE base, so
 *    erasing on a cutout never bleeds black in.
 *  • Remove background derives a cutout from the base.
 *  • Keep re-derives that cutout with extra "keep" chunks restored.
 * The displayed/returned `working` image is recomputed from the base after each op,
 * so the base (the original) is preserved for Keep no matter what came before.
 *
 * Pass `file`/`src` for the image to DISPLAY, and `originalFile`/`originalSrc` for the
 * pristine opaque original to edit from (e.g. show a saved cutout but keep its
 * original). `onApply` returns the new working image and its base.
 */
export function ImageEditorDialog({
	open,
	onOpenChange,
	file,
	src,
	originalFile,
	originalSrc,
	onApply,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	file?: File | null;
	src?: string | null;
	originalFile?: File | null;
	originalSrc?: string | null;
	onApply: (working: File, base: File) => void;
}) {
	const imgRef = useRef<HTMLImageElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const ringRef = useRef<HTMLDivElement>(null);
	const drawing = useRef<Stroke | null>(null);
	const cropAnchor = useRef<{ x: number; y: number } | null>(null);
	// keepRef accumulates the full keep mask (cumulative across runs); keepStrokes is
	// only the not-yet-processed paint, cleared once a run finishes.
	const keepRef = useRef<Stroke[]>([]);
	const eraseRef = useRef<Stroke[]>([]);
	const runTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [working, setWorking] = useState<File | null>(null); // displayed/returned
	const [base, setBase] = useState<File | null>(null); // opaque source of truth
	const [bgRemoved, setBgRemoved] = useState(false);
	const [url, setUrl] = useState<string | null>(null);
	const [baseUrl, setBaseUrl] = useState<string | null>(null);
	const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
	const [tool, setTool] = useState<Tool>('erase');
	const [strokes, setStrokes] = useState<Stroke[]>([]);
	const [keepStrokes, setKeepStrokes] = useState<Stroke[]>([]);
	const [brushPct, setBrushPct] = useState(6);
	const [cropRect, setCropRect] = useState<Rect | null>(null);
	const [busy, setBusy] = useState<null | 'load' | 'erase' | 'removebg'>(null);

	// Seed working + base when the dialog opens.
	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		setBusy('load');
		(async () => {
			try {
				const w = file ?? (src ? await fetchAsFile(src) : null);
				const original =
					originalFile ?? (originalSrc ? await fetchAsFile(originalSrc) : null);
				const b = original ?? w;
				if (cancelled) return;
				setWorking(w);
				setBase(b);
				// If a distinct original was supplied, the displayed image is already a
				// derived cutout — start in the background-removed state.
				setBgRemoved(b !== w);
			} catch {
				if (!cancelled) toast.error('Could not load image');
			} finally {
				if (!cancelled) setBusy(null);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [open, file, src, originalFile, originalSrc]);

	useEffect(() => {
		if (!working) return setUrl(null);
		const objectUrl = URL.createObjectURL(working);
		setUrl(objectUrl);
		return () => URL.revokeObjectURL(objectUrl);
	}, [working]);

	// Object URL for the opaque base — shown faintly under the cutout in Keep mode
	// so the (transparent) removed areas are visible to paint over.
	useEffect(() => {
		if (!base) return setBaseUrl(null);
		const objectUrl = URL.createObjectURL(base);
		setBaseUrl(objectUrl);
		return () => URL.revokeObjectURL(objectUrl);
	}, [base]);

	// Reset transient tool state each time the dialog opens.
	useEffect(() => {
		if (!open) return;
		setTool('erase');
		setStrokes([]);
		setKeepStrokes([]);
		setCropRect(null);
		drawing.current = null;
		cropAnchor.current = null;
		eraseRef.current = [];
		keepRef.current = [];
		if (runTimer.current) clearTimeout(runTimer.current);
	}, [open]);

	useEffect(() => {
		return () => {
			if (runTimer.current) clearTimeout(runTimer.current);
		};
	}, []);

	const redraw = useCallback(
		(eraseList: Stroke[], keepList: Stroke[], rect: Rect | null) => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			if (tool === 'erase' || tool === 'keep') {
				for (const stroke of eraseList) paintStroke(ctx, stroke, PAINT);
				for (const stroke of keepList) paintStroke(ctx, stroke, KEEP_PAINT);
				if (drawing.current) {
					paintStroke(
						ctx,
						drawing.current,
						tool === 'keep' ? KEEP_PAINT : PAINT,
					);
				}
				return;
			}
			ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			if (rect) {
				ctx.clearRect(rect.x, rect.y, rect.w, rect.h);
				ctx.strokeStyle = '#fff';
				ctx.lineWidth = Math.max(2, canvas.width * 0.004);
				ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
			}
		},
		[tool],
	);

	useEffect(() => {
		redraw(strokes, keepStrokes, cropRect);
	}, [strokes, keepStrokes, cropRect, dims, redraw]);

	const brushWidth = () => (dims ? (brushPct / 100) * dims.w : 0);

	// Move/size the DOM brush ring to follow the cursor (display pixels).
	const updateRing = (e: PointerEvent<HTMLCanvasElement>) => {
		const ring = ringRef.current;
		const canvas = canvasRef.current;
		if (!ring || !canvas) return;
		if (busy) {
			ring.style.display = 'none';
			return;
		}
		const rect = canvas.getBoundingClientRect();
		const d = (brushPct / 100) * rect.width;
		ring.style.width = `${d}px`;
		ring.style.height = `${d}px`;
		ring.style.left = `${e.clientX - rect.left}px`;
		ring.style.top = `${e.clientY - rect.top}px`;
		ring.style.display = 'block';
	};

	const hideRing = () => {
		if (ringRef.current) ringRef.current.style.display = 'none';
	};

	const toNatural = (e: PointerEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current!;
		const rect = canvas.getBoundingClientRect();
		return {
			x: ((e.clientX - rect.left) / rect.width) * canvas.width,
			y: ((e.clientY - rect.top) / rect.height) * canvas.height,
		};
	};

	function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
		if (!dims || busy) return;
		e.currentTarget.setPointerCapture(e.pointerId);
		const p = toNatural(e);
		if (tool === 'erase' || tool === 'keep') {
			updateRing(e);
			drawing.current = { points: [p], width: brushWidth() };
			redraw(strokes, keepStrokes, cropRect);
		} else {
			cropAnchor.current = p;
			setCropRect({ x: p.x, y: p.y, w: 0, h: 0 });
		}
	}

	function onPointerMove(e: PointerEvent<HTMLCanvasElement>) {
		if (!dims) return;
		if (tool === 'erase' || tool === 'keep') {
			updateRing(e);
			if (drawing.current) {
				drawing.current.points.push(toNatural(e));
				redraw(strokes, keepStrokes, cropRect);
			}
		} else {
			const a = cropAnchor.current;
			if (!a) return;
			const p = toNatural(e);
			setCropRect({
				x: Math.min(a.x, p.x),
				y: Math.min(a.y, p.y),
				w: Math.abs(p.x - a.x),
				h: Math.abs(p.y - a.y),
			});
		}
	}

	function onPointerUp(e: PointerEvent<HTMLCanvasElement>) {
		try {
			e.currentTarget.releasePointerCapture(e.pointerId);
		} catch {
			/* capture may already be released */
		}
		const stroke = drawing.current;
		drawing.current = null;
		if (tool === 'erase') {
			if (stroke) {
				eraseRef.current = [...eraseRef.current, stroke];
				setStrokes(eraseRef.current);
				scheduleRun();
			}
		} else if (tool === 'keep') {
			if (stroke) {
				keepRef.current = [...keepRef.current, stroke];
				setKeepStrokes((prev) => [...prev, stroke]);
				scheduleRun();
			}
		} else {
			cropAnchor.current = null;
		}
	}

	function onPointerLeave() {
		hideRing();
	}

	// Debounced so several quick strokes paint a region and apply together once you
	// stop, instead of firing a (slow) model pass per stroke.
	function scheduleRun() {
		if (runTimer.current) clearTimeout(runTimer.current);
		const activeTool = tool;
		runTimer.current = setTimeout(() => {
			runTimer.current = null;
			if (activeTool === 'erase') void runErase(eraseRef.current);
			else if (activeTool === 'keep') void runRemoveBg();
		}, 550);
	}

	/** Recompute the displayed cutout from a base + the accumulated keep mask. */
	async function deriveCutout(fromBase: File) {
		const mask = dims
			? await strokeMask(keepRef.current, dims.w, dims.h)
			: undefined;
		return removeImageBackground(fromBase, mask);
	}

	async function runRemoveBg() {
		if (!base) return;
		setBusy('removebg');
		try {
			setWorking(await deriveCutout(base));
			setBgRemoved(true);
			setKeepStrokes([]); // strokes are baked into the result now
		} catch {
			toast.error('Background removal unavailable');
		} finally {
			setBusy(null);
		}
	}

	/** Plain cutout: discard keep edits and re-cut the largest piece. */
	async function resetRemoveBg() {
		if (!base) return;
		keepRef.current = [];
		setKeepStrokes([]);
		setBusy('removebg');
		try {
			setWorking(await removeImageBackground(base));
			setBgRemoved(true);
		} catch {
			toast.error('Background removal unavailable');
		} finally {
			setBusy(null);
		}
	}

	async function runErase(eraseList: Stroke[]) {
		if (!base || !dims || eraseList.length === 0) return;
		setBusy('erase');
		try {
			const mask = await strokeMask(eraseList, dims.w, dims.h);
			if (!mask) throw new Error('mask export failed');
			// Inpaint the OPAQUE base (never the transparent cutout), then re-derive
			// the displayed cutout so the erase and the background removal compose.
			const erased = await inpaintImage(base, mask);
			setBase(erased);
			eraseRef.current = [];
			setStrokes([]);
			setWorking(bgRemoved ? await deriveCutout(erased) : erased);
		} catch {
			toast.error('Could not erase that area');
		} finally {
			setBusy(null);
		}
	}

	async function applyCrop() {
		if (!base || !cropRect) return;
		setBusy('removebg');
		try {
			const cropped = await cropToFile(base, cropRect);
			if (!cropped) {
				toast.error('Drag a larger area to crop');
				return;
			}
			// Crop invalidates keep-mask coordinates; start fresh on the cropped base.
			keepRef.current = [];
			setKeepStrokes([]);
			setCropRect(null);
			setBase(cropped);
			setWorking(bgRemoved ? await removeImageBackground(cropped) : cropped);
		} catch {
			toast.error('Could not crop');
		} finally {
			setBusy(null);
		}
	}

	function done() {
		if (working && base) onApply(working, base);
		onOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
			<DialogContent className="sm:max-w-2xl" showCloseButton={!busy}>
				<DialogHeader>
					<DialogTitle>Edit photo</DialogTitle>
					<DialogDescription>
						{tool === 'erase'
							? 'Paint over the hanger or anything else. It is erased and rebuilt when you lift your cursor.'
							: tool === 'keep'
								? 'Paint over parts that were wrongly removed. They come back when you lift your cursor.'
								: 'Drag a box to crop. Cropped photos are centered on a white square so nothing is cut off.'}
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-wrap items-center gap-1.5">
					<Button
						type="button"
						size="sm"
						variant={tool === 'erase' ? 'brand' : 'outline'}
						disabled={!!busy}
						onClick={() => setTool('erase')}
					>
						<Eraser /> Erase
					</Button>
					<Button
						type="button"
						size="sm"
						variant={tool === 'keep' ? 'brand' : 'outline'}
						disabled={!!busy}
						onClick={() => setTool('keep')}
					>
						<Brush /> Keep
					</Button>
					<Button
						type="button"
						size="sm"
						variant={tool === 'crop' ? 'brand' : 'outline'}
						disabled={!!busy}
						onClick={() => setTool('crop')}
					>
						<Crop /> Crop
					</Button>
					<span className="mx-1 h-5 w-px bg-border" />
					<Button
						type="button"
						size="sm"
						variant="ghost"
						loading={busy === 'removebg'}
						disabled={!base || !!busy}
						onClick={resetRemoveBg}
					>
						<Sparkles /> Remove background
					</Button>
				</div>

				<div className="flex justify-center rounded-lg bg-surface-sunken p-2">
					<div className="relative inline-block leading-none">
						{tool === 'keep' && baseUrl && (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={baseUrl}
								alt=""
								aria-hidden
								className="pointer-events-none absolute inset-0 z-0 size-full rounded-md object-contain opacity-30 select-none"
								draggable={false}
							/>
						)}
						{url && (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								ref={imgRef}
								src={url}
								alt=""
								onLoad={() => {
									const img = imgRef.current;
									if (img) {
										setDims({ w: img.naturalWidth, h: img.naturalHeight });
									}
								}}
								className="relative z-10 block max-h-[55vh] w-auto max-w-full rounded-md select-none"
								draggable={false}
							/>
						)}
						{dims && (
							<canvas
								ref={canvasRef}
								width={dims.w}
								height={dims.h}
								onPointerDown={onPointerDown}
								onPointerMove={onPointerMove}
								onPointerUp={onPointerUp}
								onPointerLeave={onPointerLeave}
								className="absolute inset-0 z-20 size-full cursor-crosshair touch-none rounded-md"
							/>
						)}
						{(tool === 'erase' || tool === 'keep') && (
							<div
								ref={ringRef}
								aria-hidden
								style={{
									display: 'none',
									boxShadow:
										'0 0 0 1.5px rgba(0,0,0,0.7), inset 0 0 0 1.5px rgba(0,0,0,0.7)',
								}}
								className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
							/>
						)}
						{busy && (
							<div className="absolute inset-0 z-40 grid place-content-center rounded-md bg-background/60">
								<Loader2 className="size-6 animate-spin" />
							</div>
						)}
					</div>
				</div>

				{/* Per-tool controls — brush actions auto-run when you lift the cursor. */}
				{tool === 'crop' ? (
					<div className="flex flex-wrap items-center justify-end gap-3">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={!!busy || !cropRect}
							onClick={() => setCropRect(null)}
						>
							<Trash2 /> Reset
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							loading={busy === 'removebg'}
							disabled={!!busy || !cropRect}
							onClick={applyCrop}
						>
							<Crop /> Apply crop
						</Button>
					</div>
				) : (
					<label className="flex items-center gap-2 text-xs text-muted-foreground">
						Brush
						<input
							type="range"
							min={2}
							max={20}
							value={brushPct}
							disabled={!!busy}
							onChange={(e) => setBrushPct(Number(e.target.value))}
							className="h-1.5 flex-1 cursor-ew-resize accent-brand"
						/>
					</label>
				)}

				<DialogFooter showCloseButton>
					<Button
						type="button"
						variant="brand"
						disabled={!working || !!busy}
						onClick={done}
					>
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
