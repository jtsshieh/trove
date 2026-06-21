import type { TripClothingBoard } from '../_data/fetchers';

/** A single clothing provision with its joined clothing + type, as the board uses it. */
export type BoardProvision = TripClothingBoard['clothingProvisions'][number];

/** A day-scoped outfit grouping. */
export type BoardOutfit = TripClothingBoard['tripOutfits'][number];

/** A per-day note. */
export type BoardNote = TripClothingBoard['dayNotes'][number];

/** The wardrobe catalog entry shown in the closet panel. */
export type ClosetItem = {
	id: string;
	imageKey: string | null;
	typeName: string;
	type: { category: string };
} & Record<string, unknown>;
