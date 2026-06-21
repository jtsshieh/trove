-- CreateEnum
CREATE TYPE "PieceSize" AS ENUM ('Compact', 'Large');

-- AlterTable
ALTER TABLE "clothes" ADD COLUMN     "order" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "user_settings" ADD COLUMN     "piece_size" "PieceSize" NOT NULL DEFAULT 'Compact';

-- Backfill clothing "order" with monotonic lexorank values per user, mirroring the
-- existing wardrobe sort (type → brand → color). Each value is the lexorank format
-- `0|<6-char base-36>:` so it stays parseable by the app's reorder helpers.
DO $$
DECLARE
  rec RECORD;
  i BIGINT;
  n BIGINT;
  digits TEXT := '0123456789abcdefghijklmnopqrstuvwxyz';
  enc TEXT;
BEGIN
  FOR rec IN
    SELECT "id",
           row_number() OVER (
             PARTITION BY "user_id"
             ORDER BY "type_name" ASC, "brand_name" ASC, "color" ASC, "id" ASC
           ) AS rn
    FROM "clothes"
  LOOP
    -- Spread ranks out (×8) so there's room to insert between them later.
    n := 100000 + rec.rn * 8;
    enc := '';
    i := n;
    WHILE length(enc) < 6 LOOP
      enc := substr(digits, (i % 36)::int + 1, 1) || enc;
      i := i / 36;
    END LOOP;
    UPDATE "clothes" SET "order" = '0|' || enc || ':' WHERE "id" = rec."id";
  END LOOP;
END $$;
