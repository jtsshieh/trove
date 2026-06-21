-- CreateTable
CREATE TABLE "trip_clothing_brings" (
    "id" TEXT NOT NULL,
    "bringing" INTEGER NOT NULL,
    "trip_id" TEXT NOT NULL,
    "clothing_id" TEXT NOT NULL,

    CONSTRAINT "trip_clothing_brings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_clothing_brings_trip_id_clothing_id_key" ON "trip_clothing_brings"("trip_id", "clothing_id");

-- AddForeignKey
ALTER TABLE "trip_clothing_brings" ADD CONSTRAINT "trip_clothing_brings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_clothing_brings" ADD CONSTRAINT "trip_clothing_brings_clothing_id_fkey" FOREIGN KEY ("clothing_id") REFERENCES "clothes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
