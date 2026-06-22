-- AlterTable
ALTER TABLE "clothing_provisions" ADD COLUMN     "containerless" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "luggage_order" TEXT,
ADD COLUMN     "luggage_provision_id" TEXT;

-- AlterTable
ALTER TABLE "container_provisions" ADD COLUMN     "trip_order" TEXT;

-- AlterTable
ALTER TABLE "essential_provisions" ADD COLUMN     "containerless" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "luggage_order" TEXT,
ADD COLUMN     "luggage_provision_id" TEXT;

-- AlterTable
ALTER TABLE "essentials" ADD COLUMN     "order" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "luggage_provisions" ADD COLUMN     "trip_order" TEXT;

-- AddForeignKey
ALTER TABLE "clothing_provisions" ADD CONSTRAINT "clothing_provisions_luggage_provision_id_fkey" FOREIGN KEY ("luggage_provision_id") REFERENCES "luggage_provisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "essential_provisions" ADD CONSTRAINT "essential_provisions_luggage_provision_id_fkey" FOREIGN KEY ("luggage_provision_id") REFERENCES "luggage_provisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill existing rows with valid, distinct lexoranks so the new ordered surfaces
-- (closet essentials order; container/suitcase card reordering) work on already-created
-- data. Without this, every existing row shares a blank/NULL rank, which sorts to an
-- edge and makes drag-to-reorder compute a rank from an unparseable value. Digit-only
-- values like "0|000001:" are valid LexoRanks and sort numerically; existing display
-- order is preserved (essentials by name; provisions by their gear's catalog order).
UPDATE "essentials" e
SET "order" = '0|' || lpad(r.rn::text, 6, '0') || ':'
FROM (
  SELECT id, row_number() OVER (PARTITION BY "user_id" ORDER BY "name", id) AS rn
  FROM "essentials"
) r
WHERE e.id = r.id;

UPDATE "container_provisions" cp
SET "trip_order" = '0|' || lpad(r.rn::text, 6, '0') || ':'
FROM (
  SELECT cp2.id,
    row_number() OVER (PARTITION BY cp2."trip_id" ORDER BY c."order", cp2.id) AS rn
  FROM "container_provisions" cp2
  JOIN "containers" c ON c.id = cp2."container_id"
) r
WHERE cp.id = r.id;

UPDATE "luggage_provisions" lp
SET "trip_order" = '0|' || lpad(r.rn::text, 6, '0') || ':'
FROM (
  SELECT lp2.id,
    row_number() OVER (PARTITION BY lp2."trip_id" ORDER BY l."order", lp2.id) AS rn
  FROM "luggage_provisions" lp2
  JOIN "luggage" l ON l.id = lp2."luggage_id"
) r
WHERE lp.id = r.id;
