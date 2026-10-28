import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { eventCard, flattenEvent, genreCard } from '../common/selects';
import { windowFor } from '../common/time';
import { liveEventWhere } from '../events/events.service';
import { districtNames } from './districts';
import { openStatus, weekFromMonday } from './hours';

const hoursSelect = { select: { weekday: true, opensAt: true, closesAt: true } } as const;

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mekân listesi — bu gece etkinliği olanlar önce, sonra şu an açık olanlar, sonra sıradaki etkinlik tarihine göre.
   * openNow=true: yalnız şu an açık olanlar (saati girilmemiş mekânlar elenir).
   */
  async list(q: { genre?: string; district?: string; openNow?: boolean }) {
    const now = new Date();
    const rows = await this.prisma.venue.findMany({
      where: {
        ...(q.genre ? { genres: { some: { slug: q.genre } } } : {}),
        ...(q.district ? { district: { in: await districtNames(this.prisma, q.district) } } : {}),
      },
      select: {
        slug: true,
        name: true,
        district: true,
        coverUrl: true,
        priceLevel: true,
        ageLimit: true,
        source: true,
        genres: genreCard,
        hours: hoursSelect,
        events: {
          where: liveEventWhere(now),
          orderBy: { startsAt: 'asc' },
          take: 1,
          select: { slug: true, title: true, startsAt: true },
        },
      },
    });

    const tonightEnd = windowFor('tonight', now).to!.getTime();
    const venues = rows
      .map(({ events, hours, ...v }) => {
        const next = events[0] ?? null;
        return { ...v, ...openStatus(hours, now), nextEvent: next, tonight: !!next && next.startsAt.getTime() < tonightEnd };
      })
      .filter((v) => !q.openNow || v.openNow);
    return venues.sort((a, b) => {
      if (a.tonight !== b.tonight) return a.tonight ? -1 : 1;
      if (!!a.openNow !== !!b.openNow) return a.openNow ? -1 : 1;
      const at = a.nextEvent?.startsAt.getTime() ?? Infinity;
      const bt = b.nextEvent?.startsAt.getTime() ?? Infinity;
      return at - bt || a.name.localeCompare(b.name, 'tr');
    });
  }

  async get(slug: string) {
    const now = new Date();
    const v = await this.prisma.venue.findUnique({
      where: { slug },
      include: {
        genres: {
          orderBy: { sort: 'asc' },
          select: {
            slug: true,
            name: true,
            color: true,
            // "Mekânın sesi": türün ilk çalışan küratörlü istasyonu
            stations: { where: { status: { not: 'DOWN' } }, orderBy: { sort: 'asc' }, take: 1 },
          },
        },
        events: {
          where: liveEventWhere(now),
          orderBy: { startsAt: 'asc' },
          take: 20,
          select: eventCard,
        },
        hours: hoursSelect,
        soundStation: { include: { genre: { select: { slug: true } } } },
      },
    });
    if (!v) throw new NotFoundException('Mekân bulunamadı');
    // Elle seçilen istasyon (çalışıyorsa), yoksa ana türün varsayılanı
    const chosen = v.soundStation && v.soundStation.status !== 'DOWN' ? v.soundStation : null;
    const sound = chosen ?? v.genres.find((g) => g.stations.length)?.stations[0] ?? null;
    const { searchText: _st, soundStation: _ss, soundStationId: _ssid, ...venue } = v;
    return {
      ...venue,
      ...openStatus(v.hours, now),
      hours: weekFromMonday(v.hours),
      genres: v.genres.map(({ stations: _s, ...g }) => g),
      events: v.events.map(flattenEvent),
      sound: sound && {
        id: sound.id,
        name: sound.name,
        streamUrl: sound.streamUrl,
        hasMetadata: sound.hasMetadata && sound.status === 'OK',
        genre: chosen ? chosen.genre.slug : (v.genres.find((g) => g.stations[0]?.id === sound.id)?.slug ?? null),
      },
    };
  }
}
