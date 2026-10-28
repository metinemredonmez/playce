-- Mekân iletişim alanları, kapasite ve elle seçilen "mekânın sesi" istasyonu
-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "reservationUrl" TEXT,
ADD COLUMN     "soundStationId" TEXT,
ADD COLUMN     "website" TEXT;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_soundStationId_fkey" FOREIGN KEY ("soundStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

