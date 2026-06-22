import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

/**
 * Generative inpainting via LaMa (Large Mask Inpainting) ONNX, run on CPU through
 * onnxruntime-node — the same runtime BRIA RMBG uses. Given a photo and a 1-channel
 * mask (white = erase), it removes the masked region and reconstructs plausible
 * pixels underneath. We use it to erase the clamp hanger from garment photos and
 * rebuild the strip of waistband the clamps were covering.
 *
 * Heavy + slow on first call (downloads the model, cold ONNX session). Callers run
 * it opt-in (a user paints the mask) and handle failure gracefully. Inpainting runs
 * BEFORE background removal so LaMa has the wall + fabric as real fill context.
 */
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

export async function inpaint(input: Buffer, maskInput: Buffer): Promise<Buffer> {
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
