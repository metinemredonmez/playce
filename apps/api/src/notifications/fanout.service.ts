import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { trDateTimeLabel, trTimeLabel } from '../common/time';
import { NewNotification, NotificationsService } from './notifications.service';

const REMIND_BEFORE_MS = 3 * 60 * 60 * 1000;

/** Etkinlikten doğan bildirimler: yeni etkinlik (takipçilere) ve "birazdan başlıyor" hatırlatması. */
@Injectable()
export class FanoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Yayında olup henüz duyurulmamış etkinlikler → sanatçı ve mekân takipçilerine bildirim.
   * Kişi hem sanatçıyı hem mekânı takip ediyorsa tek bildirim (sanatçı öncelikli).
   * Başlamış etkinlik duyurulmaz, yalnız işaretlenir.
   */
  async eventFanout(now = new Date()) {
    const events = await this.prisma.event.findMany({
      where: { status: 'PUBLISHED', fanoutAt: null },
      take: 50,
      select: {
        id: true,
        slug: true,
        title: true,
        startsAt: true,
        venue: { select: { name: true, follows: { select: { userId: true } } } },
        artists: { orderBy: { sort: 'asc' }, select: { artist: { select: { name: true, follows: { select: { userId: true } } } } } },
      },
    });

    let created = 0;
    for (const e of events) {
      if (e.startsAt > now) {
        const base = { deeplink: `playce://event/${e.slug}`, data: { eventSlug: e.slug } };
        const when = `${trDateTimeLabel(e.startsAt)} · ${e.venue.name}`;
        const byUser = new Map<string, NewNotification>();
        for (const { artist } of e.artists) {
          for (const { userId } of artist.follows) {
            if (byUser.has(userId)) continue;
            byUser.set(userId, {
              ...base,
              userId,
              kind: 'ARTIST_NEW_EVENT',
              title: `${artist.name} sahne alıyor`,
              body: `${e.title} — ${when}`,
              dedupeKey: `event:${e.id}:${userId}`,
            });
          }
        }
        for (const { userId } of e.venue.follows) {
          if (byUser.has(userId)) continue;
          byUser.set(userId, {
            ...base,
            userId,
            kind: 'VENUE_NEW_EVENT',
            title: `Yeni etkinlik: ${e.venue.name}`,
            body: `${e.title} — ${trDateTimeLabel(e.startsAt)}`,
            dedupeKey: `event:${e.id}:${userId}`,
          });
        }
        created += await this.notifications.notify([...byUser.values()], now);
      }
      await this.prisma.event.update({ where: { id: e.id }, data: { fanoutAt: now } });
    }
    return { events: events.length, notifications: created };
  }

  /** Kaydedilen etkinlik başlamadan 3 saat önce (bir kez) hatırlat. */
  async eventReminders(now = new Date()) {
    const saves = await this.prisma.savedEvent.findMany({
      where: { remindedAt: null, event: { status: 'PUBLISHED', startsAt: { gt: now, lte: new Date(now.getTime() + REMIND_BEFORE_MS) } } },
      take: 1000,
      select: { userId: true, eventId: true, event: { select: { slug: true, title: true, startsAt: true, venue: { select: { name: true } } } } },
    });
    if (!saves.length) return { reminders: 0 };

    const created = await this.notifications.notify(
      saves.map((s) => ({
        userId: s.userId,
        kind: 'EVENT_REMINDER',
        title: `Birazdan: ${s.event.title}`,
        body: `${trTimeLabel(s.event.startsAt)} · ${s.event.venue.name}`,
        deeplink: `playce://event/${s.event.slug}`,
        data: { eventSlug: s.event.slug },
        dedupeKey: `reminder:${s.eventId}:${s.userId}`,
      })),
      now,
    );
    await this.prisma.savedEvent.updateMany({
      where: { OR: saves.map((s) => ({ userId: s.userId, eventId: s.eventId })) },
      data: { remindedAt: now },
    });
    return { reminders: created };
  }
}
