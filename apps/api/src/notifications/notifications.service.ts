import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationKind, NotificationPref, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { quietHoursEnd } from '../common/time';
import { UsersService } from '../users/users.service';
import { PushTokenDto, UpdatePrefsDto } from './notifications.dto';

export type NewNotification = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  deeplink?: string;
  data?: Prisma.InputJsonObject;
  /** Aynı anahtarla ikinci kayıt oluşmaz (fan-out tekrar çalışsa da tek bildirim). */
  dedupeKey?: string;
};

type PrefFlag = 'artistNewEvent' | 'venueNewEvent' | 'artistOnRadio' | 'eventReminder' | 'weeklyDigest' | 'marketing';
type Prefs = Pick<NotificationPref, PrefFlag | 'quietStart' | 'quietEnd'>;

const PREF_FOR: Partial<Record<NotificationKind, PrefFlag>> = {
  ARTIST_NEW_EVENT: 'artistNewEvent',
  VENUE_NEW_EVENT: 'venueNewEvent',
  ARTIST_ON_RADIO: 'artistOnRadio',
  EVENT_REMINDER: 'eventReminder',
  WEEKLY_DIGEST: 'weeklyDigest',
  CAMPAIGN: 'marketing',
};

/** Şemadaki varsayılanlarla aynı (tercih satırı olmayan eski kullanıcılar için). */
const DEFAULT_PREFS: Prefs = {
  artistNewEvent: true,
  venueNewEvent: true,
  artistOnRadio: true,
  eventReminder: true,
  weeklyDigest: true,
  marketing: false,
  quietStart: 1,
  quietEnd: 10,
};

/** Ertelenirse anlamını yitirir: sessiz saatte push yerine yalnız bildirim kutusuna düşer. */
const NOT_DEFERRABLE = new Set<NotificationKind>(['ARTIST_ON_RADIO']);

const prefSelect = {
  artistNewEvent: true,
  venueNewEvent: true,
  artistOnRadio: true,
  eventReminder: true,
  weeklyDigest: true,
  marketing: true,
  quietStart: true,
  quietEnd: true,
} satisfies Prisma.NotificationPrefSelect;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  /**
   * Bildirim üretir (kutuya yazar, push'u kuyruğa alır). Kullanıcının tercihi kapalıysa hiç üretmez;
   * sessiz saatteyse push'u sessizlik bitene kadar erteler. Gönderimi worker yapar (PushService).
   */
  async notify(items: NewNotification[], now = new Date()): Promise<number> {
    if (!items.length) return 0;
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(items.map((i) => i.userId))] }, deletedAt: null, bannedAt: null },
      select: { id: true, notificationPref: { select: prefSelect } },
    });
    const prefs = new Map(users.map((u) => [u.id, u.notificationPref ?? DEFAULT_PREFS]));

    const rows: Prisma.NotificationCreateManyInput[] = [];
    for (const n of items) {
      const p = prefs.get(n.userId);
      const flag = PREF_FOR[n.kind];
      if (!p || (flag && !p[flag])) continue;
      const quietUntil = n.kind === 'SYSTEM' ? null : quietHoursEnd(now, p.quietStart, p.quietEnd);
      const skip = quietUntil !== null && NOT_DEFERRABLE.has(n.kind);
      rows.push({
        ...n,
        pushState: skip ? 'SKIPPED' : 'PENDING',
        pushAfter: skip ? now : (quietUntil ?? now),
        createdAt: now,
      });
    }
    if (!rows.length) return 0;
    const { count } = await this.prisma.notification.createMany({ data: rows, skipDuplicates: true });
    return count;
  }

  async list(userId: string, cursor?: string, limit = 30) {
    const take = Math.min(Math.max(limit, 1), 100);
    const [rows, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true, kind: true, title: true, body: true, deeplink: true, data: true, readAt: true, createdAt: true },
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    const items = rows.slice(0, take);
    return { items, nextCursor: rows.length > take ? items[items.length - 1].id : null, unread };
  }

  /** ids verilmezse hepsi okundu. */
  async markRead(userId: string, ids?: string[]) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() },
    });
    return { unread: await this.prisma.notification.count({ where: { userId, readAt: null } }) };
  }

  async prefs(userId: string) {
    return this.prisma.notificationPref.upsert({ where: { userId }, create: { userId }, update: {}, select: prefSelect });
  }

  async updatePrefs(userId: string, dto: UpdatePrefsDto) {
    if (dto.marketing && !(await this.users.hasConsent(userId, 'ACIK_RIZA_PAZARLAMA'))) {
      throw new BadRequestException('Pazarlama bildirimleri için önce açık rıza ver (ACIK_RIZA_PAZARLAMA)');
    }
    return this.prisma.notificationPref.upsert({ where: { userId }, create: { userId, ...dto }, update: dto, select: prefSelect });
  }

  /** Cihaz token'ı o an cihazda kim giriş yaptıysa ona bağlanır; girişsizse bağsız kalır. */
  async registerToken(dto: PushTokenDto, userId?: string) {
    const data = { deviceId: dto.deviceId, platform: dto.platform, userId: userId ?? null, lastSeenAt: new Date() };
    await this.prisma.pushToken.upsert({ where: { token: dto.token }, create: { token: dto.token, ...data }, update: data });
    return { ok: true, linked: Boolean(userId) };
  }
}
