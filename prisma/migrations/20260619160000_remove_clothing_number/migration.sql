-- DropIndex
DROP INDEX "clothes_brand_name_brand_line_color_type_name_number_modifi_key";

-- AlterTable
ALTER TABLE "clothes" DROP COLUMN "number";

-- CreateIndex
CREATE UNIQUE INDEX "clothes_brand_name_brand_line_color_type_name_modifier_key" ON "clothes"("brand_name", "brand_line", "color", "type_name", "modifier");

