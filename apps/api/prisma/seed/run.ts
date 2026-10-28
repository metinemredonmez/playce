import { PrismaClient } from '@prisma/client';

/** Seed betiklerinin ortak çalıştırıcısı: bağlan, çalıştır, sayıları yaz, kapat. */
export function run(task: (prisma: PrismaClient) => Promise<void>) {
  const prisma = new PrismaClient();
  task(prisma)
    .then(async () => {
      const [genres, tags, stations, artists, venues, events] = await Promise.all([
        prisma.genre.count(),
        prisma.tagGenreMap.count(),
        prisma.station.count(),
        prisma.artist.count(),
        prisma.venue.count(),
        prisma.event.count(),
      ]);
      console.log(`Seed tamam → tür ${genres} (etiket ${tags}), istasyon ${stations}, sanatçı ${artists}, mekân ${venues}, etkinlik ${events}`);
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
