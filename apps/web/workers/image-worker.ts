/**
 * Piscina worker for the two CPU-bound image operations — LaMa inpaint and BRIA
 * RMBG background removal. Both used to run on the Next.js main thread inside
 * their route handlers; the pure-JS pixel loops (flood-fill, normalization,
 * compositing) and transformers.js preprocessing blocked the event loop, so the
 * single standalone server stopped serving pages while an image was processed.
 * Running them here, on a worker thread, frees the main loop.
 *
 * Loaded directly as TypeScript via Node's native type stripping (Node >= 23.6 /
 * the pinned node:24) — no build step. Node erases types, it does NOT transform,
 * so this file must stay "erasable": type-only imports use `import type` / inline
 * `import('…')` type expressions, and there are no enums/namespaces/param-props.
 *
 * Models are loaded lazily and cached for the life of the worker; with the pool's
 * idleTimeout the worker (and its model memory) is reclaimed when editing stops.
 */
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import type { ImageResult, ImageTask } from '@/lib/image-tasks';

// Cap ONNX threading so a single inference doesn't saturate every core — the
// target NAS is a 2-core box that must keep serving pages during inference.
// Override with IMAGE_ORT_THREADS on a beefier host.
const ORT_THREADS = Math.max(1, Number(process.env.IMAGE_ORT_THREADS ?? 1) || 1);

// ---------------------------------------------------------------------------
// LaMa inpainting (onnxruntime-node)
// ---------------------------------------------------------------------------

let sessionPromise:
	| Promise<{
			ort: typeof import('onnxruntime-node');
			session: import('onnxruntime-node').InferenceSession;
	  }>
	| undefined;

// Carve's LaMa ONNX export (fp32). Override with LAMA_MODEL_URL, or point
// LAMA_MODEL_PATH at a pre-downloaded local file to skip the fetch entirely.
const MODEL_URL =
	process.env.LAMA_MODEL_URL ??
	'https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx';

async function resolveModelPath(): Promise<string> {
	const explicit = process.env.LAMA_MODEL_PATH;
	if (explicit) return explicit;

	const dir =
		process.env.LAMA_CACHE_DIR ?? path.join(process.cwd(), '.cache', 'lama');
	const file = path.join(dir, 'lama.onnx');
	if (existsSync(file)) return file;

	await fs.mkdir(dir, { recursive: true });
	const res = await fetch(MODEL_URL);
	if (!res.ok) {
		throw new Error(`LaMa model download failed: ${res.status}`);
	}
	await fs.writeFile(file, Buffer.from(await res.arrayBuffer()));
	return file;
}

async function loadSession() {
	if (!sessionPromise) {
		sessionPromise = (async () => {
			const ort = await import('onnxruntime-node');
			const session = await ort.InferenceSession.create(
				await resolveModelPath(),
				{
					intraOpNumThreads: ORT_THREADS,
					interOpNumThreads: 1,
					executionMode: 'sequential',
				},
			);
			return { ort, session };
		})();
	}
	return sessionPromise;
}

/** Tensor inputs as `{ name, shape }`, dropping any non-tensor metadata. */
function tensorInputs(session: import('onnxruntime-node').InferenceSession) {
	const out: { name: string; shape: ReadonlyArray<number | string> }[] = [];
	for (const m of session.inputMetadata) {
		if (m.isTensor) out.push({ name: m.name, shape: m.shape });
	}
	return out;
}

/**
 * Picks the image (3-channel) and mask (1-channel) input names, and the model's
 * expected spatial size. LaMa needs H/W as multiples of 8; symbolic (dynamic) dims
 * fall back to LAMA_SIZE (default 512, the size Carve's export was traced at).
 */
function describeModel(session: import('onnxruntime-node').InferenceSession) {
	const tensors = tensorInputs(session);
	const fallback = Math.max(
		64,
		Math.round(Number(process.env.LAMA_SIZE ?? 512) / 8) * 8,
	);
	const dim = (v: number | string | undefined) =>
		typeof v === 'number' && v > 0 ? v : fallback;

	const image =
		tensors.find((t) => t.shape[1] === 3) ??
		tensors.find((t) => t.name.toLowerCase().includes('image')) ??
		tensors[0];
	const mask =
		tensors.find((t) => t.shape[1] === 1) ??
		tensors.find((t) => t.name.toLowerCase().includes('mask')) ??
		tensors[1] ??
		tensors[0];

	return {
		imageName: image?.name ?? 'image',
		maskName: mask?.name ?? 'mask',
		height: dim(image?.shape[2]),
		width: dim(image?.shape[3]),
	};
}

const clampByte = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

async function inpaint(input: Uint8Array, maskInput: Uint8Array): Promise<Buffer> {
	const { ort, session } = await loadSession();
	const model = describeModel(session);

	// Work at a capped resolution: /api/upload downscales to 1024 webp anyway, so
	// there's nothing to gain from compositing at full phone-camera resolution.
	// `.rotate()` bakes in EXIF orientation so the mask (painted on the displayed,
	// already-upright image) lines up with the pixels — same lesson as RMBG.
	const base = await sharp(input)
		.rotate()
		.resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
		.toBuffer();
	const meta = await sharp(base).metadata();
	const baseW = meta.width ?? 0;
	const baseH = meta.height ?? 0;
	if (!baseW || !baseH) throw new Error('inpaint: could not read image size');

	const mw = model.width;
	const mh = model.height;
	const mp = mw * mh;

	// Image → CHW float. LaMa's standard preprocessing normalizes to [0, 1]; a few
	// exports want raw [0, 255] instead — set LAMA_IMAGE_DIV=1 if output looks washed.
	const div = Number(process.env.LAMA_IMAGE_DIV ?? 255) || 255;
	const rgb = await sharp(base)
		.resize(mw, mh, { fit: 'fill' })
		.flatten({ background: '#ffffff' })
		.raw()
		.toBuffer();
	const imgData = new Float32Array(3 * mp);
	for (let i = 0; i < mp; i++) {
		imgData[i] = rgb[i * 3] / div;
		imgData[mp + i] = rgb[i * 3 + 1] / div;
		imgData[2 * mp + i] = rgb[i * 3 + 2] / div;
	}

	// Mask → 1×1×H×W float, binarized (white painted = erase = 1).
	const maskRaw = await sharp(maskInput)
		.resize(mw, mh, { fit: 'fill' })
		.removeAlpha()
		.greyscale()
		.raw()
		.toBuffer();
	const maskData = new Float32Array(mp);
	for (let i = 0; i < mp; i++) maskData[i] = maskRaw[i] > 127 ? 1 : 0;

	const feeds: Record<string, import('onnxruntime-node').Tensor> = {
		[model.imageName]: new ort.Tensor('float32', imgData, [1, 3, mh, mw]),
		[model.maskName]: new ort.Tensor('float32', maskData, [1, 1, mh, mw]),
	};
	const result = await session.run(feeds);
	const outTensor = result[session.outputNames[0]];
	const od = outTensor.data as Float32Array;

	// LaMa exports vary: some emit [0, 255], some [0, 1]. Detect and scale.
	let max = 0;
	for (let i = 0; i < od.length; i++) if (od[i] > max) max = od[i];
	const scale = max <= 1.5 ? 255 : 1;

	const outRgb = Buffer.alloc(mp * 3);
	for (let i = 0; i < mp; i++) {
		outRgb[i * 3] = clampByte(od[i] * scale);
		outRgb[i * 3 + 1] = clampByte(od[mp + i] * scale);
		outRgb[i * 3 + 2] = clampByte(od[2 * mp + i] * scale);
	}

	// Composite only the masked pixels back over the full-res base so untouched
	// areas keep their original sharpness. A soft (blurred) mask feathers the seam.
	const filled = await sharp(outRgb, { raw: { width: mw, height: mh, channels: 3 } })
		.resize(baseW, baseH, { fit: 'fill' })
		.raw()
		.toBuffer();
	// Flatten transparency onto white (not the black that `removeAlpha` leaves) so
	// inpainting a cutout never bleeds black into the result.
	const baseRgb = await sharp(base)
		.flatten({ background: '#ffffff' })
		.raw()
		.toBuffer();
	const alpha = await sharp(maskInput)
		.resize(baseW, baseH, { fit: 'fill' })
		.removeAlpha()
		.greyscale()
		.blur(2)
		.raw()
		.toBuffer();

	const composed = Buffer.alloc(baseW * baseH * 3);
	for (let i = 0; i < baseW * baseH; i++) {
		const a = alpha[i] / 255;
		for (let c = 0; c < 3; c++) {
			const j = i * 3 + c;
			composed[j] = clampByte(baseRgb[j] * (1 - a) + filled[j] * a);
		}
	}

	return sharp(composed, { raw: { width: baseW, height: baseH, channels: 3 } })
		.png()
		.toBuffer();
}

// ---------------------------------------------------------------------------
// Background removal (BRIA RMBG via @huggingface/transformers)
// ---------------------------------------------------------------------------

let pipelinePromise:
	| Promise<{ model: any; processor: any; RawImage: any }>
	| undefined;

async function loadPipeline() {
	if (!pipelinePromise) {
		pipelinePromise = (async () => {
			const { AutoModel, AutoProcessor, RawImage } = await import(
				'@huggingface/transformers'
			);
			const id = process.env.RMBG_MODEL ?? 'briaai/RMBG-1.4';
			const model = await AutoModel.from_pretrained(id, {
				session_options: {
					intraOpNumThreads: ORT_THREADS,
					interOpNumThreads: 1,
				},
			});
			const processor = await AutoProcessor.from_pretrained(id);
			return { model, processor, RawImage };
		})();
	}
	return pipelinePromise;
}

async function removeBackground(
	input: Uint8Array,
	keepMask?: Uint8Array,
): Promise<Buffer> {
	const { model, processor, RawImage } = await loadPipeline();

	// Normalize EXIF orientation FIRST: physically rotate to upright and strip the
	// EXIF tag. RawImage + sharp(raw) both ignore EXIF, so without this a phone
	// photo's mask and pixels end up at different orientations → a 90° tilt. Using
	// one upright buffer for both the model input and the pixel extraction keeps
	// them aligned and the result upright.
	const upright = await sharp(input).rotate().toBuffer();

	const image = await RawImage.fromBlob(new Blob([new Uint8Array(upright)]));
	const { pixel_values } = await processor(image);
	const { output } = await model({ input: pixel_values });
	const mask = await RawImage.fromTensor(
		output[0].mul(255).to('uint8'),
	).resize(image.width, image.height);

	const width: number = image.width;
	const height: number = image.height;

	// Aggressive cleanup: drop faint halos (threshold) and keep the largest
	// connected blob — the centered garment — so stray specks elsewhere are
	// erased. When a keep-mask is supplied, also keep any blob the user painted
	// over, restoring whole garment chunks RMBG wrongly dropped. Within the kept
	// blobs the original (soft, anti-aliased) alpha is preserved for clean edges.
	const N = width * height;
	const threshold = Number(process.env.RMBG_THRESHOLD ?? 150);
	const fg = new Uint8Array(N);
	for (let i = 0; i < N; i++) fg[i] = mask.data[i] >= threshold ? 1 : 0;
	const label = new Int32Array(N);
	const stack: number[] = [];
	let best = 0;
	let bestSize = 0;
	let current = 0;
	for (let seed = 0; seed < N; seed++) {
		if (!fg[seed] || label[seed]) continue;
		current++;
		let size = 0;
		stack.length = 0;
		stack.push(seed);
		label[seed] = current;
		while (stack.length) {
			const p = stack.pop() as number;
			size++;
			const x = p % width;
			if (x > 0 && fg[p - 1] && !label[p - 1]) {
				label[p - 1] = current;
				stack.push(p - 1);
			}
			if (x < width - 1 && fg[p + 1] && !label[p + 1]) {
				label[p + 1] = current;
				stack.push(p + 1);
			}
			if (p >= width && fg[p - width] && !label[p - width]) {
				label[p - width] = current;
				stack.push(p - width);
			}
			if (p < N - width && fg[p + width] && !label[p + width]) {
				label[p + width] = current;
				stack.push(p + width);
			}
		}
		if (size > bestSize) {
			bestSize = size;
			best = current;
		}
	}

	// The kept set is the largest blob plus every blob the keep-mask touches.
	const kept = new Set<number>();
	if (best) kept.add(best);
	if (keepMask) {
		const keep = await sharp(keepMask)
			.resize(width, height, { fit: 'fill' })
			.removeAlpha()
			.greyscale()
			.raw()
			.toBuffer();
		for (let i = 0; i < N; i++) {
			if (keep[i] > 127 && fg[i]) kept.add(label[i]);
		}
	}
	for (let i = 0; i < N; i++) if (!kept.has(label[i])) mask.data[i] = 0;

	const rgb = await sharp(upright)
		.resize(width, height, { fit: 'fill' })
		.removeAlpha()
		.raw()
		.toBuffer();

	const rgba = Buffer.alloc(width * height * 4);
	for (let i = 0; i < width * height; i++) {
		rgba[i * 4] = rgb[i * 3];
		rgba[i * 4 + 1] = rgb[i * 3 + 1];
		rgba[i * 4 + 2] = rgb[i * 3 + 2];
		rgba[i * 4 + 3] = mask.data[i];
	}

	return sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

// ---------------------------------------------------------------------------
// Piscina entry
// ---------------------------------------------------------------------------

export default async function run(task: ImageTask): Promise<ImageResult> {
	switch (task.kind) {
		case 'inpaint':
			return inpaint(task.input, task.mask);
		case 'remove-background':
			return removeBackground(task.input, task.keepMask);
	}
}
