-- ============================================================================
-- house_inventory
--   Dissolve the Essential *catalog* into three apps (Bathroom / Electronics /
--   Documents) while KEEPING the Essentials *packing* layer (now item-polymorphic).
--   Lossless: every catalog row + provision/group-item is migrated BEFORE any drop.
--   (Dev DB is empty so the data-move steps touch 0 rows; the SQL is written to be
--   correct against a populated production database.)
-- ============================================================================

-- 1. New enums ---------------------------------------------------------------
CREATE TYPE "BathroomNature" AS ENUM ('Consumable', 'Appliance', 'Launderable');
CREATE TYPE "BathroomForm" AS ENUM ('Liquid', 'Gel', 'Aerosol', 'Cream', 'Paste', 'Powder');
CREATE TYPE "BathroomUnitState" AS ENUM ('InStock', 'InUse', 'Dirty', 'Gone');
CREATE TYPE "BrandDomain" AS ENUM ('Closet', 'Bathroom', 'Electronics');
CREATE TYPE "ElectronicKind" AS ENUM ('Device', 'Cable', 'PowerBank', 'Accessory');
CREATE TYPE "EssentialKind" AS ENUM ('Bathroom', 'Electronic', 'Document');
CREATE TYPE "LuggageKind" AS ENUM ('CarryOn', 'Checked', 'Personal');
CREATE TYPE "VolumeUnit" AS ENUM ('Milliliters', 'FluidOunces');

-- 2. New tables (created BEFORE the data move so we can INSERT into them) ------
CREATE TABLE "bathroom_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nature" "BathroomNature" NOT NULL DEFAULT 'Consumable',
    "form" "BathroomForm",
    "notes" TEXT,
    "image_key" TEXT,
    "order" TEXT NOT NULL DEFAULT '',
    "type_name" TEXT,
    "type_id" TEXT,
    "brand_name" TEXT,
    "brand_id" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "bathroom_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bathroom_variants" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "capacity_ml" DOUBLE PRECISION,
    "order" TEXT NOT NULL DEFAULT '',
    "product_id" TEXT NOT NULL,

    CONSTRAINT "bathroom_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bathroom_batches" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "acquired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "variant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "bathroom_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bathroom_units" (
    "id" TEXT NOT NULL,
    "state" "BathroomUnitState" NOT NULL DEFAULT 'InStock',
    "checked_out_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "variant_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "trip_id" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "bathroom_units_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bathroom_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "bathroom_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" TEXT NOT NULL DEFAULT '',
    "user_id" TEXT NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "electronics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ElectronicKind" NOT NULL DEFAULT 'Accessory',
    "brand_name" TEXT,
    "brand_id" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "acquired_at" TIMESTAMP(3),
    "image_key" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "order" TEXT NOT NULL DEFAULT '',
    "user_id" TEXT NOT NULL,

    CONSTRAINT "electronics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "electronic_links" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "accessory_id" TEXT NOT NULL,

    CONSTRAINT "electronic_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bathroom_products_user_id_name_key" ON "bathroom_products"("user_id", "name");
CREATE INDEX "bathroom_variants_product_id_idx" ON "bathroom_variants"("product_id");
CREATE INDEX "bathroom_batches_variant_id_acquired_at_idx" ON "bathroom_batches"("variant_id", "acquired_at");
CREATE INDEX "bathroom_units_variant_id_state_idx" ON "bathroom_units"("variant_id", "state");
CREATE UNIQUE INDEX "bathroom_types_user_id_name_key" ON "bathroom_types"("user_id", "name");
CREATE INDEX "documents_user_id_idx" ON "documents"("user_id");
CREATE INDEX "electronics_user_id_idx" ON "electronics"("user_id");
CREATE UNIQUE INDEX "electronic_links_device_id_accessory_id_key" ON "electronic_links"("device_id", "accessory_id");

ALTER TABLE "bathroom_products" ADD CONSTRAINT "bathroom_products_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "bathroom_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bathroom_products" ADD CONSTRAINT "bathroom_products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bathroom_products" ADD CONSTRAINT "bathroom_products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bathroom_variants" ADD CONSTRAINT "bathroom_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "bathroom_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bathroom_batches" ADD CONSTRAINT "bathroom_batches_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "bathroom_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bathroom_batches" ADD CONSTRAINT "bathroom_batches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bathroom_units" ADD CONSTRAINT "bathroom_units_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "bathroom_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bathroom_units" ADD CONSTRAINT "bathroom_units_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "bathroom_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bathroom_units" ADD CONSTRAINT "bathroom_units_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bathroom_units" ADD CONSTRAINT "bathroom_units_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bathroom_types" ADD CONSTRAINT "bathroom_types_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "electronics" ADD CONSTRAINT "electronics_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "electronics" ADD CONSTRAINT "electronics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "electronic_links" ADD CONSTRAINT "electronic_links_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "electronics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "electronic_links" ADD CONSTRAINT "electronic_links_accessory_id_fkey" FOREIGN KEY ("accessory_id") REFERENCES "electronics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Additive columns on existing tables -------------------------------------
ALTER TABLE "brands" ADD COLUMN "domains" "BrandDomain"[];
UPDATE "brands" SET "domains" = ARRAY['Closet']::"BrandDomain"[] WHERE "domains" IS NULL;  -- existing brands are clothing brands

ALTER TABLE "luggage_provisions" ADD COLUMN "kind" "LuggageKind" NOT NULL DEFAULT 'CarryOn';
ALTER TABLE "user_settings" ADD COLUMN "volume_unit" "VolumeUnit" NOT NULL DEFAULT 'Milliliters';

-- Nullable polymorphic columns on the KEPT provision + group-item tables.
ALTER TABLE "essential_provisions"
    ADD COLUMN "kind" "EssentialKind",
    ADD COLUMN "bathroom_variant_id" TEXT,
    ADD COLUMN "electronic_id" TEXT,
    ADD COLUMN "document_id" TEXT,
    ADD COLUMN "bathroom_unit_id" TEXT;
ALTER TABLE "essential_group_items"
    ADD COLUMN "kind" "EssentialKind",
    ADD COLUMN "bathroom_variant_id" TEXT,
    ADD COLUMN "electronic_id" TEXT,
    ADD COLUMN "document_id" TEXT;

-- 4. Move the Essential catalog → three apps ---------------------------------
INSERT INTO "electronics" ("id", "name", "image_key", "quantity", "order", "user_id")
    SELECT "id", "name", "image_key", "quantity", "order", "user_id" FROM "essentials" WHERE "category" = 'Electronic';

INSERT INTO "documents" ("id", "name", "order", "user_id")
    SELECT "id", "name", "order", "user_id" FROM "essentials" WHERE "category" = 'Document';  -- name only

INSERT INTO "bathroom_products" ("id", "name", "image_key", "order", "user_id")
    SELECT "id", "name", "image_key", "order", "user_id" FROM "essentials" WHERE "category" = 'Toiletry';  -- nature defaults Consumable, form null

-- one default variant per toiletry product (variant.product_id = essential.id)
INSERT INTO "bathroom_variants" ("id", "product_id", "order")
    SELECT gen_random_uuid()::text, "id", '' FROM "essentials" WHERE "category" = 'Toiletry';

-- one acquisition batch per product carrying the old on-hand quantity
INSERT INTO "bathroom_batches" ("id", "variant_id", "quantity", "acquired_at", "user_id")
    SELECT gen_random_uuid()::text, v."id", e."quantity", CURRENT_TIMESTAMP, e."user_id"
    FROM "essentials" e JOIN "bathroom_variants" v ON v."product_id" = e."id"
    WHERE e."category" = 'Toiletry';

-- one InStock unit per acquired quantity (generate_series fans the count into rows)
INSERT INTO "bathroom_units" ("id", "variant_id", "batch_id", "state", "user_id")
    SELECT gen_random_uuid()::text, v."id", b."id", 'InStock', e."user_id"
    FROM "essentials" e
    JOIN "bathroom_variants" v ON v."product_id" = e."id"
    JOIN "bathroom_batches" b ON b."variant_id" = v."id"
    CROSS JOIN generate_series(1, GREATEST(e."quantity", 1))
    WHERE e."category" = 'Toiletry';

-- 5. Backfill the polymorphic columns from each row's source category ---------
UPDATE "essential_provisions" ep SET
    "kind" = (CASE e."category" WHEN 'Toiletry' THEN 'Bathroom' WHEN 'Electronic' THEN 'Electronic' ELSE 'Document' END)::"EssentialKind",
    "bathroom_variant_id" = (CASE WHEN e."category" = 'Toiletry' THEN v."id" END),
    "electronic_id" = (CASE WHEN e."category" = 'Electronic' THEN e."id" END),
    "document_id" = (CASE WHEN e."category" = 'Document' THEN e."id" END)
    FROM "essentials" e LEFT JOIN "bathroom_variants" v ON v."product_id" = e."id"
    WHERE ep."essential_id" = e."id";

UPDATE "essential_group_items" egi SET
    "kind" = (CASE e."category" WHEN 'Toiletry' THEN 'Bathroom' WHEN 'Electronic' THEN 'Electronic' ELSE 'Document' END)::"EssentialKind",
    "bathroom_variant_id" = (CASE WHEN e."category" = 'Toiletry' THEN v."id" END),
    "electronic_id" = (CASE WHEN e."category" = 'Electronic' THEN e."id" END),
    "document_id" = (CASE WHEN e."category" = 'Document' THEN e."id" END)
    FROM "essentials" e LEFT JOIN "bathroom_variants" v ON v."product_id" = e."id"
    WHERE egi."essential_id" = e."id";

-- 6. Lock in: NOT NULL, drop old essential_id (cascades FK + unique index) -----
ALTER TABLE "essential_provisions" ALTER COLUMN "kind" SET NOT NULL;
ALTER TABLE "essential_provisions" DROP COLUMN "essential_id";
ALTER TABLE "essential_group_items" ALTER COLUMN "kind" SET NOT NULL;
ALTER TABLE "essential_group_items" DROP COLUMN "essential_id";

-- Exactly-one-item CHECK (Prisma can't express it; harmless to its drift checks).
ALTER TABLE "essential_provisions" ADD CONSTRAINT "essential_provisions_one_item_chk"
    CHECK ((("bathroom_variant_id" IS NOT NULL)::int + ("electronic_id" IS NOT NULL)::int + ("document_id" IS NOT NULL)::int) = 1);
ALTER TABLE "essential_group_items" ADD CONSTRAINT "essential_group_items_one_item_chk"
    CHECK ((("bathroom_variant_id" IS NOT NULL)::int + ("electronic_id" IS NOT NULL)::int + ("document_id" IS NOT NULL)::int) = 1);

-- 7. Polymorphic FK constraints (columns are now backfilled) -------------------
ALTER TABLE "essential_provisions" ADD CONSTRAINT "essential_provisions_bathroom_variant_id_fkey" FOREIGN KEY ("bathroom_variant_id") REFERENCES "bathroom_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "essential_provisions" ADD CONSTRAINT "essential_provisions_electronic_id_fkey" FOREIGN KEY ("electronic_id") REFERENCES "electronics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "essential_provisions" ADD CONSTRAINT "essential_provisions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "essential_provisions" ADD CONSTRAINT "essential_provisions_bathroom_unit_id_fkey" FOREIGN KEY ("bathroom_unit_id") REFERENCES "bathroom_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "essential_group_items" ADD CONSTRAINT "essential_group_items_bathroom_variant_id_fkey" FOREIGN KEY ("bathroom_variant_id") REFERENCES "bathroom_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "essential_group_items" ADD CONSTRAINT "essential_group_items_electronic_id_fkey" FOREIGN KEY ("electronic_id") REFERENCES "electronics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "essential_group_items" ADD CONSTRAINT "essential_group_items_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. Drop the now-unused category + the dissolved catalog ----------------------
ALTER TABLE "trip_essential_groups" DROP COLUMN "category";
DROP TABLE "essentials";   -- cascades essentials_user_id_fkey
DROP TYPE "EssentialCategory";
