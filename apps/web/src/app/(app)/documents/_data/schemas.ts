import { z } from 'zod';

export const createDocumentSchema = z.object({
	name: z.string().min(1),
});

export const editDocumentSchema = z.object({
	name: z.string().min(1).optional(),
});

/**
 * Drag-to-reorder a document. The client (controlled @dnd-kit board) computes the
 * new lexorank from the document's final neighbours and sends it directly.
 */
export const changeDocumentOrderSchema = z.object({
	order: z.string(),
});

/**
 * Scan-to-name: the photographed document is uploaded only so the model can read
 * it. We just send its object key; the photo itself is never stored on the Document.
 */
export const scanDocumentImageSchema = z.object({
	imageKey: z.string(),
});

/**
 * Bulk create from the documents "Bulk add" flow. Each row is an independent draft;
 * the action creates them one-by-one and reports per-index failures so a partial
 * failure never loses the whole batch.
 */
export const createDocumentBatchSchema = z.object({
	items: z.array(createDocumentSchema).min(1),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type EditDocumentInput = z.infer<typeof editDocumentSchema>;

/** What the LLM scan returns to prefill the document name. */
export interface DocumentScanSuggestion {
	name?: string;
}
