-- AlterTable
ALTER TABLE "containers" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "essentials" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "luggage" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "essential_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "essential_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "essential_group_items" (
    "id" TEXT NOT NULL,
    "order" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "essential_id" TEXT NOT NULL,

    CONSTRAINT "essential_group_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "essential_group_items_group_id_essential_id_key" ON "essential_group_items"("group_id", "essential_id");

-- AddForeignKey
ALTER TABLE "essential_groups" ADD CONSTRAINT "essential_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "essential_group_items" ADD CONSTRAINT "essential_group_items_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "essential_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "essential_group_items" ADD CONSTRAINT "essential_group_items_essential_id_fkey" FOREIGN KEY ("essential_id") REFERENCES "essentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
