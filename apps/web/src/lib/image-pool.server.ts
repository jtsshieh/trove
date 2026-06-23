import path from 'node:path';

import { Piscina } from 'piscina';

import type { ImageResult, ImageTask } from '@/lib/image-tasks';

// Trace anchor — NEVER executed. The worker (workers/image-worker.ts) imports
// these at runtime, but it lives outside Next's module graph, so without a
// reference from a traced module Next's standalone tracer ships neither package
// nor their transitive deps (onnxruntime-common, onnxruntime-web, global-agent,
// @huggingface/jinja, …). The env guard is never set, so the heavy native libs
// load only inside the worker thread, never in this main process. This
// reproduces the dependency trace the route handlers produced before the move.
if (process.env.__TRACE_IMAGE_WORKER_DEPS__ === '1') {
	void import('onnxruntime-node');
	void import('@huggingface/transformers');
}

/**
 * Worker pool for the CPU-bound image operations (LaMa inpaint, RMBG background
 * removal). Route handlers dispatch here instead of running inference inline, so
 * the Next.js main thread stays free to serve pages while a worker grinds.
 *
 * Defaults are tuned for the target single NAS (2-core box): one worker, one task
 * at a time, models reclaimed after an idle window. All knobs are env-overridable
 * for beefier hosts.
 */
const MAX_THREADS = Math.max(1, Number(process.env.IMAGE_WORKER_THREADS ?? 1) || 1);
// Keep a worker (and its loaded models) warm through an editing session, then let
// it exit so the ~hundreds of MB of model memory is reclaimed when idle.
const IDLE_TIMEOUT_MS = Math.max(
	0,
	Number(process.env.IMAGE_WORKER_IDLE_MS ?? 5 * 60_000) || 0,
);
// Backpressure: with one worker doing one task at a time, a deep queue would just
// blow past the route's maxDuration. Reject early so the route fast-fails (503).
const MAX_QUEUE = Math.max(1, Number(process.env.IMAGE_WORKER_MAX_QUEUE ?? 8) || 1);

// Cache on globalThis so Next.js dev HMR reuses one pool instead of leaking a new
// one (and its worker threads) on every module reload — same pattern as the
// Prisma client singleton.
const globalForPool = globalThis as unknown as {
	imagePool?: Piscina<ImageTask, ImageResult>;
};

function getPool(): Piscina<ImageTask, ImageResult> {
	if (!globalForPool.imagePool) {
		globalForPool.imagePool = new Piscina<ImageTask, ImageResult>({
			filename: path.join(process.cwd(), 'workers', 'image-worker.ts'),
			maxThreads: MAX_THREADS,
			minThreads: 0,
			concurrentTasksPerWorker: 1,
			idleTimeout: IDLE_TIMEOUT_MS,
			maxQueue: MAX_QUEUE,
		});
	}
	return globalForPool.imagePool;
}

export function runRemoveBackground(
	input: Uint8Array,
	keepMask?: Uint8Array,
): Promise<ImageResult> {
	return getPool().run({ kind: 'remove-background', input, keepMask });
}

export function runInpaint(
	input: Uint8Array,
	mask: Uint8Array,
): Promise<ImageResult> {
	return getPool().run({ kind: 'inpaint', input, mask });
}
