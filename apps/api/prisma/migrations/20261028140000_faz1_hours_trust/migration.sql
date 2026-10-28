-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "refundPolicy" TEXT,
ADD COLUMN     "sellerName" TEXT,
ADD COLUMN     "totalPriceNote" TEXT;

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "ageLimit" INTEGER,
ADD COLUMN     "doorPolicy" TEXT,
ADD COLUMN     "dressCode" TEXT;

-- CreateTable
CREATE TABLE "VenueHours" (
    "venueId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "opensAt" TEXT NOT NULL,
    "closesAt" TEXT NOT NULL,

    CONSTRAINT "VenueHours_pkey" PRIMARY KEY ("venueId","weekday")
);

-- AddForeignKey
ALTER TABLE "VenueHours" ADD CONSTRAINT "VenueHours_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

