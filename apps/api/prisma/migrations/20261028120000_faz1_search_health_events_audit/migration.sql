-- Arama: trigram indeksleri ve Türkçe karakter katlama için (PG13+ "trusted" eklentiler; DB sahibi kurabilir)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- CreateEnum
CREATE TYPE "ExternalSource" AS ENUM ('BILETIX', 'PASSO', 'BUBILET', 'BILETINIAL', 'MOBILET', 'ETKINLIKIO', 'TICKETMASTER', 'BANDSINTOWN', 'MUSICBRAINZ', 'SPOTIFY', 'APPLE_MUSIC', 'GOOGLE_PLACES', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "StationStatus" AS ENUM ('OK', 'DOWN', 'NO_METADATA');

-- AlterEnum
ALTER TYPE "EventStatus" ADD VALUE 'REVIEW';

-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "ageLimit" INTEGER,
ADD COLUMN     "doorsAt" TIMESTAMP(3),
ADD COLUMN     "isFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "ticketProvider" "ExternalSource";

-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "bitrate" INTEGER,
ADD COLUMN     "codec" TEXT,
ADD COLUMN     "failCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "status" "StationStatus" NOT NULL DEFAULT 'OK';

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "TagGenreMap" (
    "tag" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "TagGenreMap_pkey" PRIMARY KEY ("tag","genreId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "diff" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Artist_searchText_idx" ON "Artist" USING GIN ("searchText" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Event_searchText_idx" ON "Event" USING GIN ("searchText" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Station_searchText_idx" ON "Station" USING GIN ("searchText" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Venue_searchText_idx" ON "Venue" USING GIN ("searchText" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "TagGenreMap" ADD CONSTRAINT "TagGenreMap_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------- Arama metni (searchText) ----------
-- src/common/text.ts normalize() ile aynı sonucu verir: "Dedublüman" → "dedubluman", "MOR VE ÖTESİ" → "mor ve otesi".
-- Türkçe harfler lower()'dan önce çevrilir (lower('İ') yerel ayara bağlı).
CREATE OR REPLACE FUNCTION playce_norm(t text) RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT btrim(regexp_replace(
    lower(unaccent(translate(coalesce(t, ''), 'İIıÇçĞğÖöŞşÜüÂâÎîÛû', 'iiiccggoossuuaaiiuu'))),
    '[^a-z0-9]+', ' ', 'g'))
$$;

-- searchText'i tetikleyici doldurur: hiçbir yazma yolu (admin, seed, ham SQL) unutamaz.
-- Argümanlar: birleştirilecek sütun adları (dizi sütunları da olur: aliases).
CREATE OR REPLACE FUNCTION playce_search_text() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  row jsonb := to_jsonb(NEW);
  parts text[] := '{}';
  col text;
BEGIN
  FOREACH col IN ARRAY TG_ARGV LOOP
    parts := parts || coalesce(row ->> col, '');
  END LOOP;
  NEW."searchText" := playce_norm(array_to_string(parts, ' '));
  RETURN NEW;
END $$;

CREATE TRIGGER artist_search_text BEFORE INSERT OR UPDATE ON "Artist"
  FOR EACH ROW EXECUTE FUNCTION playce_search_text('name', 'aliases');
CREATE TRIGGER venue_search_text BEFORE INSERT OR UPDATE ON "Venue"
  FOR EACH ROW EXECUTE FUNCTION playce_search_text('name', 'district');
CREATE TRIGGER event_search_text BEFORE INSERT OR UPDATE ON "Event"
  FOR EACH ROW EXECUTE FUNCTION playce_search_text('title');
CREATE TRIGGER station_search_text BEFORE INSERT OR UPDATE ON "Station"
  FOR EACH ROW EXECUTE FUNCTION playce_search_text('name');

-- Mevcut satırları doldur (tetikleyici çalışır)
UPDATE "Artist" SET "searchText" = '';
UPDATE "Venue" SET "searchText" = '';
UPDATE "Event" SET "searchText" = '';
UPDATE "Station" SET "searchText" = '';

-- Ücretsiz etkinlikler
UPDATE "Event" SET "isFree" = true WHERE "priceFrom" = 0;
