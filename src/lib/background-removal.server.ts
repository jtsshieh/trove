import sharp from 'sharp';

/**
 * Background removal via BRIA RMBG (transformers.js, ONNX, CPU). Lazily loads the
 * model once and caches it; returns a transparent-background PNG. Heavy + slow on
 * first call — callers run it opt-in and handle failures gracefully.
 */
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
			const model = await AutoModel.from_pretrained(id);
			const processor = await AutoProcessor.from_pretrained(id);
			return { model, processor, RawImage };
		})();
	}
	return pipelinePromise;
}

export async function removeBackground(
	input: Buffer,
	keepMask?: Buffer,
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
