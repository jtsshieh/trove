-- AlterTable
ALTER TABLE "essential_provisions" ADD COLUMN     "trip_essential_group_id" TEXT;

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

-- AddForeignKey
ALTER TABLE "trip_essential_groups" ADD CONSTRAINT "trip_essential_groups_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_essential_groups" ADD CONSTRAINT "trip_essential_groups_source_group_id_fkey" FOREIGN KEY ("source_group_id") REFERENCES "essential_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "essential_provisions" ADD CONSTRAINT "essential_provisions_trip_essential_group_id_fkey" FOREIGN KEY ("trip_essential_group_id") REFERENCES "trip_essential_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
