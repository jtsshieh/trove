import type { Document } from '@/generated/prisma/client';
import { api } from '@/lib/api/client';

import type {
	CreateDocumentInput,
	DocumentScanSuggestion,
	EditDocumentInput,
} from './schemas';

/** Client-side fetch functions for the documents resource. */

export const fetchDocuments = () => api.get<Document[]>('/api/documents');

export const createDocument = (input: CreateDocumentInput) =>
	api.post<Document>('/api/documents', input);

export const createDocumentBatch = (items: CreateDocumentInput[]) =>
	api.post<{ created: number; failed: number[] }>('/api/documents/batch', {
		items,
	});

export const scanDocumentImage = (imageKey: string) =>
	api.post<{ suggestion: DocumentScanSuggestion | null }>(
		'/api/documents/scan',
		{ imageKey },
	);

export const editDocument = (id: string, input: EditDocumentInput) =>
	api.patch<Document>(`/api/documents/${id}`, input);

export const deleteDocument = (id: string) =>
	api.del<{ ok: true }>(`/api/documents/${id}`);

export const reorderDocument = (id: string, order: string) =>
	api.patch<{ ok: true }>(`/api/documents/${id}/order`, { order });
