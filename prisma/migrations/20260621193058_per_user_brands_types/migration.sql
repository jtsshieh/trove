-- DropForeignKey
ALTER TABLE "clothes" DROP CONSTRAINT "clothes_brand_name_fkey";

-- DropForeignKey
ALTER TABLE "clothes" DROP CONSTRAINT "clothes_type_name_fkey";

-- DropIndex
DROP INDEX "clothes_brand_name_brand_line_color_type_name_modifier_key";

-- AlterTable
ALTER TABLE "brands" DROP CONSTRAINT "brands_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL,
ADD CONSTRAINT "brands_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "clothes" ADD COLUMN     "brand_id" TEXT NOT NULL,
ADD COLUMN     "type_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "clothing_types" DROP CONSTRAINT "clothing_types_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "user_id" TEXT NOT NULL,
ADD CONSTRAINT "clothing_types_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_user_id_name_key" ON "brands"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "clothes_user_id_brand_name_brand_line_color_type_name_modif_key" ON "clothes"("user_id", "brand_name", "brand_line", "color", "type_name", "modifier");

-- CreateIndex
CREATE UNIQUE INDEX "clothing_types_user_id_name_key" ON "clothing_types"("user_id", "name");

-- AddForeignKey
ALTER TABLE "clothes" ADD CONSTRAINT "clothes_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothes" ADD CONSTRAINT "clothes_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "clothing_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clothing_types" ADD CONSTRAINT "clothing_types_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
