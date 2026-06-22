/**
 * One drag-and-drop vocabulary for the whole app.
 *
 * Item ids stay raw entity ids (so existing `findIndex(x => x.id === source.id)`
 * keeps working). Zone identity + the discriminator live in dnd-kit `data`, never
 * in the id. The `kind` field removes all reorder-vs-move ambiguity in onDragEnd.
 */

export type ItemType =
	| 'clothing'
	| 'essential'
	| 'container'
	| 'suitcase' // a LuggageProvision card, reorderable on the luggage board
	| 'outfit' // a reusable Outfit template (closet → day materializes it)
	| 'trip-outfit'; // a placed TripOutfit grouping (day → day moves it whole)

export type ZoneKind =
	| 'day' // clothing on a calendar/list day            owner = isoDay
	| 'outfit' // clothing grouped under a TripOutfit      owner = tripOutfitId
	| 'outfitLane' // reorderable TripOutfits within a day  owner = isoDay
	| 'universal' // day-agnostic universal section         owner = tripId
	| 'backup' // day-agnostic backup section               owner = tripId
	| 'essentialCategory' // trip essentials by category    owner = EssentialCategory
	| 'essentialSubgroup' // a trip essential sub-group      owner = tripEssentialGroupId
	| 'container' // items packed into a ContainerProvision  owner = containerProvisionId
	| 'containerless' // items packed straight into luggage  owner = tripId
	| 'containerCards' // the reorderable container cards     owner = tripId
	| 'luggage' // containers packed into a LuggageProvision owner = luggageProvisionId
	| 'luggageCards' // the reorderable suitcase cards        owner = tripId
	| 'wardrobe' // wardrobe grid, one zone per type group   owner = typeName
	| 'closet'; // wardrobe panel (drag source only)         owner = tripId

export interface Zone {
	kind: ZoneKind;
	ownerId: string;
}

const SEP = '::';

export function encodeZone(zone: Zone): string {
	return `${zone.kind}${SEP}${zone.ownerId}`;
}

export function decodeZone(value: string): Zone {
	const [kind, ownerId = ''] = value.split(SEP);
	return { kind: kind as ZoneKind, ownerId };
}

export function zonesEqual(a: Zone, b: Zone): boolean {
	return a.kind === b.kind && a.ownerId === b.ownerId;
}

/** dnd-kit `data` payload set on every draggable item. */
export interface ItemData {
	role: 'item';
	type: ItemType;
	zone: Zone;
}

/**
 * A drop-acceptance predicate. Beyond type-gating, lets a zone reject a drop based
 * on the source itself — e.g. wardrobe/essentials lanes that only accept items from
 * the SAME category, so cross-category drops aren't even drop candidates (no
 * highlight, no live-sort). dnd-kit calls it with the dragged source.
 */
export type AcceptPredicate = (source: { data?: unknown }) => boolean;

/** dnd-kit `data` payload set on every droppable zone. */
export interface ZoneData {
	role: 'zone';
	zone: Zone;
	accepts: ItemType[] | AcceptPredicate;
}

export function isItemData(data: unknown): data is ItemData {
	return (data as ItemData | undefined)?.role === 'item';
}

export function isZoneData(data: unknown): data is ZoneData {
	return (data as ZoneData | undefined)?.role === 'zone';
}
