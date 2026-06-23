/**
 * Task contract shared between the image worker pool (`image-pool.server.ts`)
 * and the worker entry (`workers/image-worker.ts`). Both sides import these with
 * `import type`, so the file is erased at runtime — the worker never resolves it.
 *
 * Payloads are typed as `Uint8Array` because Buffers cross the worker-thread
 * boundary via structured clone and arrive as plain `Uint8Array`; a Node
 * `Buffer` (a `Uint8Array` subclass) satisfies this on the sending side too.
 */
export type ImageTask =
	| { kind: 'remove-background'; input: Uint8Array; keepMask?: Uint8Array }
	| { kind: 'inpaint'; input: Uint8Array; mask: Uint8Array };

/** Worker result: encoded PNG bytes. */
export type ImageResult = Uint8Array;
