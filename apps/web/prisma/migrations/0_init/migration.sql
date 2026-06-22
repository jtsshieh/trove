-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ClothingCategory" AS ENUM ('Top', 'Bottom', 'Accessory');

-- CreateEnum
CREATE TYPE "EssentialCategory" AS ENUM ('Toiletry', 'Electronic', 'Document');

-- CreateEnum
CREATE TYPE "ContainerType" AS ENUM ('Clothes', 'Essentials');

-- CreateEnum
CREATE TYPE "ProvisionSection" AS ENUM ('Day', 'Universal', 'Backup');

-- CreateEnum
CREATE TYPE "DisplayMode" AS ENUM ('TextOnly', 'PictureOnly', 'Both');

-- CreateEnum
CREATE TYPE "ProvisionView" AS ENUM ('List', 'Calendar');

-- CreateEnum
CREATE TYPE "PieceSize" AS ENUM ('Compact', 'Large');

-- CreateEnum
CREATE TYPE "TripMode" AS ENUM ('Provision', 'Pack', 'Audit');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "clothes" (
    "id" TEXT NOT NULL,
    "brand_name" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "brand_line" TEXT,
    "color" TEXT NOT NULL,
    "modifier" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "type_name" TEXT NOT NULL,
    "type_id" TEXT NOT NULL,
    "image_key" TEXT,
    "order" TEXT NOT NULL DEFAULT '',
    "user_id" TEXT NOT NULL,

    CONSTRAINT "clothes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_clothing_brings" (
    "id" TEXT NOT NULL,
    "bringing" INTEGER NOT NULL,
    "trip_id" TEXT NOT NULL,
    "clothing_id" TEXT NOT NULL,

    CONSTRAINT "trip_clothing_brings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clothing_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ClothingCategory" NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "clothing_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "essential_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "essential_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_essential_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EssentialCategory" NOT NULL,
    "order" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "source_group_id" TEXT,

    CONSTRAINT "trip_essential_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "essential_group_items" (
    "id" TEXT NOT NULL,
    "order" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "essential_id" TEXT NOT NULL,

    CONSTRAINT "essential_group_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "essentials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EssentialCategory" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "image_key" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "essentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfits" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" TEXT NOT NULL,
    "image_key" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "outfits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit_items" (
    "id" TEXT NOT NULL,
    "order" TEXT NOT NULL,
    "outfit_id" TEXT NOT NULL,
    "clothing_id" TEXT NOT NULL,

    CONSTRAINT "outfit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_outfits" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "day" TIMESTAMP(3) NOT NULL,
    "order" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "source_outfit_id" TEXT,

    CONSTRAINT "trip_outfits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "containers" (
    "id" TEXT NOT NULL,
    "order" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ContainerType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "image_key" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "containers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "luggage" (
    "id" TEXT NOT NULL,
    "order" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "image_key" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "luggage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clothing_provisions" (
    "id" TEXT NOT NULL,
    "section" "ProvisionSection" NOT NULL DEFAULT 'Day',
    "day" TIMESTAMP(3),
    "day_order" TEXT NOT NULL,
    "packed" BOOLEAN NOT NULL DEFAULT false,
    "container_order" TEXT,
    "trip_id" TEXT NOT NULL,
    "clothing_id" TEXT NOT NULL,
    "container_provision_id" TEXT,
    "trip_outfit_id" TEXT,

    CONSTRAINT "clothing_provisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "essential_provisions" (
    "id" TEXT NOT NULL,
    "section" "ProvisionSection" NOT NULL DEFAULT 'Universal',
    "day" TIMESTAMP(3),
    "day_order" TEXT NOT NULL,
    "packed" BOOLEAN NOT NULL DEFAULT false,
    "container_order" TEXT,
    "trip_id" TEXT NOT NULL,
    "essential_id" TEXT NOT NULL,
    "container_provision_id" TEXT,
    "trip_essential_group_id" TEXT,

    CONSTRAINT "essential_provisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "container_provisions" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "container_id" TEXT NOT NULL,
    "luggage_provision_id" TEXT,
    "luggage_order" TEXT,
    "packed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "container_provisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "luggage_provisions" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "luggage_id" TEXT NOT NULL,

    CONSTRAINT "luggage_provisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" TEXT NOT NULL,
    "display_mode" "DisplayMode" NOT NULL DEFAULT 'Both',
    "default_provision_view" "ProvisionView" NOT NULL DEFAULT 'List',
    "piece_size" "PieceSize" NOT NULL DEFAULT 'Compact',

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "mode" "TripMode" NOT NULL DEFAULT 'Provision',
    "user_id" TEXT NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_day_notes" (
    "id" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,

    CONSTRAINT "trip_day_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passkeys" (
    "id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" BYTEA NOT NULL,
    "user_id" TEXT NOT NULL,
    "webauthn_user_id" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "transports" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" TIMESTAMP(3),
    "aaguid" TEXT NOT NULL,

    CONSTRAINT "passkeys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clothes_user_id_brand_name_brand_line_color_type_name_modif_key" ON "clothes"("user_id", "brand_name", "brand_line", "color", "type_name", "modifier");

-- CreateIndex
CREATE UNIQUE INDEX "trip_clothing_brings_trip_id_clothing_id_key" ON "trip_clothing_brings"("trip_id", "clothing_id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_user_id_name_key" ON "brands"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "clothing_types_user_id_name_key" ON "clothing_types"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "essential_group_items_group_id_essential_id_key" ON "essential_group_items"("group_id", "essential_id");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_items_outfit_id_clothing_id_key" ON "outfit_items"("outfit_id", "clothing_id");

-- CreateIndex
CREATE INDEX "trip_outfits_trip_id_day_idx" ON "trip_outfits"("trip_id", "day");

-- CreateIndex
CREATE INDEX "clothing_provisions_trip_id_section_day_idx" ON "clothing_provisions"("trip_id", "section", "day");

-- CreateIndex
CREATE INDEX "clothing_provisions_clothing_id_trip_id_idx" ON "clothing_provisions"("clothing_id", "trip_id");

-- CreateIndex
CREATE INDEX "essential_provisions_trip_id_section_day_idx" ON "essential_provisions"("trip_id", "section", "day");

-- CreateIndex
CREATE UNIQUE INDEX "trip_day_notes_trip_id_day_key" ON "trip_day_notes"("trip_id", "day");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "passkeys_credential_id_key" ON "passkeys"("credential_id");

-- AddForeignKey
ALTER TABLE "clothes" ADD CONSTRAINT "clothes_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothes" ADD CONSTRAINT "clothes_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "clothing_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothes" ADD CONSTRAINT "clothes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_clothing_brings" ADD CONSTRAINT "trip_clothing_brings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_clothing_brings" ADD CONSTRAINT "trip_clothing_brings_clothing_id_fkey" FOREIGN KEY ("clothing_id") REFERENCES "clothes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_types" ADD CONSTRAINT "clothing_types_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "essential_groups" ADD CONSTRAINT "essential_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_essential_groups" ADD CONSTRAINT "trip_essential_groups_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_essential_groups" ADD CONSTRAINT "trip_essential_groups_source_group_id_fkey" FOREIGN KEY ("source_group_id") REFERENCES "essential_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "essential_group_items" ADD CONSTRAINT "essential_group_items_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "essential_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "essential_group_items" ADD CONSTRAINT "essential_group_items_essential_id_fkey" FOREIGN KEY ("essential_id") REFERENCES "essentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "essentials" ADD CONSTRAINT "essentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfits" ADD CONSTRAINT "outfits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_clothing_id_fkey" FOREIGN KEY ("clothing_id") REFERENCES "clothes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_outfits" ADD CONSTRAINT "trip_outfits_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_outfits" ADD CONSTRAINT "trip_outfits_source_outfit_id_fkey" FOREIGN KEY ("source_outfit_id") REFERENCES "outfits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "containers" ADD CONSTRAINT "containers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "luggage" ADD CONSTRAINT "luggage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_provisions" ADD CONSTRAINT "clothing_provisions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_provisions" ADD CONSTRAINT "clothing_provisions_clothing_id_fkey" FOREIGN KEY ("clothing_id") REFERENCES "clothes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_provisions" ADD CONSTRAINT "clothing_provisions_container_provision_id_fkey" FOREIGN KEY ("container_provision_id") REFERENCES "container_provisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_provisions" ADD CONSTRAINT "clothing_provisions_trip_outfit_id_fkey" FOREIGN KEY ("trip_outfit_id") REFERENCES "trip_outfits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "essential_provisions" ADD CONSTRAINT "essential_provisions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "essential_provisions" ADD CONSTRAINT "essential_provisions_essential_id_fkey" FOREIGN KEY ("essential_id") REFERENCES "essentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "essential_provisions" ADD CONSTRAINT "essential_provisions_container_provision_id_fkey" FOREIGN KEY ("container_provision_id") REFERENCES "container_provisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "essential_provisions" ADD CONSTRAINT "essential_provisions_trip_essential_group_id_fkey" FOREIGN KEY ("trip_essential_group_id") REFERENCES "trip_essential_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "container_provisions" ADD CONSTRAINT "container_provisions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "container_provisions" ADD CONSTRAINT "container_provisions_container_id_fkey" FOREIGN KEY ("container_id") REFERENCES "containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "container_provisions" ADD CONSTRAINT "container_provisions_luggage_provision_id_fkey" FOREIGN KEY ("luggage_provision_id") REFERENCES "luggage_provisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "luggage_provisions" ADD CONSTRAINT "luggage_provisions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "luggage_provisions" ADD CONSTRAINT "luggage_provisions_luggage_id_fkey" FOREIGN KEY ("luggage_id") REFERENCES "luggage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_day_notes" ADD CONSTRAINT "trip_day_notes_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

