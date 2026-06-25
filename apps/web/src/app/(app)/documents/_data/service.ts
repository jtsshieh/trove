import { LexoRank } from 'lexorank';

import { scanDocument } from '@/lib/ai.server';
import { ApiError } from '@/lib/api/errors';
import { prisma } from '@/lib/db.server';
import { rankAfter } from '@/lib/dnd/lexorank';
import { getObject } from '@/lib/storage.server';

import type {
	CreateDocumentInput,
	DocumentScanSuggestion,
	EditDocumentInput,
} from './schemas';

/**
 * Server-side write logic for documents. Ownership is enforced here (every mutating
 * function takes the caller's `userId` and 404s on a row it doesn't own), mirroring
 * the essentials service.
 */

/** Loads a document, 404ing if it doesn't belong to `userId`. */
async function requireDocument(userId: string, id: string) {
	const document = await prisma.document.findUnique({ where: { id } });
	if (document?.userId !== userId) throw new ApiError(404, 'Document not found');
	return document;
}

/** Next lexorank after the user's last document (appends to the list order). */
async function nextDocumentRank(userId: string) {
	const last = await prisma.document.findFirst({
		where: { userId },
		orderBy: { order: 'desc' },
		select: { order: true },
	});
	return rankAfter(last?.order || null);
}

export async function createDocument(
	userId: string,
	input: CreateDocumentInput,
) {
	return prisma.document.create({
		data: {
			name: input.name,
			order: await nextDocumentRank(userId),
			user: { connect: { id: userId } },
		},
	});
}

export async function createDocumentBatch(
	userId: string,
	items: CreateDocumentInput[],
) {
	// Pre-compute one ascending lexorank per row (appended after the user's current
	// last document) so the concurrent creates below don't collide on order.
	let rank = LexoRank.parse(await nextDocumentRank(userId));
	const orders = items.map((_, i) =>
		i === 0 ? rank.toString() : (rank = rank.genNext()).toString(),
	);

	// Create independently so one bad row never rolls back the whole batch — the UI
	// keeps failed rows around (with their error) for a retry.
	const results = await Promise.all(
		items.map(async (item, index) => {
			try {
				await prisma.document.create({
					data: {
						name: item.name,
						order: orders[index],
						user: { connect: { id: userId } },
					},
				});
				return { index, ok: true as const };
			} catch (error) {
				console.error('createDocumentBatch row failed', index, error);
				return { index, ok: false as const };
			}
		}),
	);

	const failed = results.filter((r) => !r.ok).map((r) => r.index);
	return { created: items.length - failed.length, failed };
}

export async function editDocument(
	userId: string,
	id: string,
	input: EditDocumentInput,
) {
	const document = await requireDocument(userId, id);
	return prisma.document.update({
		where: { id: document.id },
		data: {
			name: input.name,
		},
	});
}

export async function deleteDocument(userId: string, id: string) {
	const document = await requireDocument(userId, id);
	await prisma.document.delete({ where: { id: document.id } });
	return { ok: true as const };
}

/** Drag-to-reorder: persist a single document's new lexorank in the list order. */
export async function reorderDocument(
	userId: string,
	id: string,
	order: string,
) {
	const document = await requireDocument(userId, id);
	await prisma.document.update({
		where: { id: document.id },
		data: { order },
	});
	return { ok: true as const };
}

/**
 * Scan-to-name: load the uploaded image bytes and ask the model for a generic
 * document name. The photo is only read here — it is NOT stored on any Document.
 * Best-effort: a failed read yields a null suggestion so the form isn't pre-filled.
 */
export async function scanDocumentImage(
	userId: string,
	imageKey: string,
): Promise<{ suggestion: DocumentScanSuggestion | null }> {
	const { body, contentType } = await getObject(imageKey);
	const ext = contentType.split('/')[1] ?? 'webp';
	const suggestion = await scanDocument(body, ext);
	return { suggestion: (suggestion as DocumentScanSuggestion | null) ?? null };
}
