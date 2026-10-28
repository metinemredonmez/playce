import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConsentKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { genreCard } from '../common/selects';
import { ConsentDto, UpdateMeDto } from './users.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
/** KVKK silme talebinden kalıcı anonimleştirmeye kadar geçen süre. */
export const DELETE_GRACE_DAYS = 30;

const meSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  city: true,
  locale: true,
  birthYear: true,
  createdAt: true,
  tasteGenres: genreCard,
  identities: { select: { provider: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: meSelect });
    if (!u) throw new NotFoundException('Kullanıcı bulunamadı');
    const { identities, ...rest } = u;
    return { ...rest, providers: identities.map((i) => i.provider) };
  }

  async update(userId: string, dto: UpdateMeDto) {
    const { tasteGenres, ...data } = dto;
    let genres: { id: string }[] | undefined;
    if (tasteGenres) {
      const rows = await this.prisma.genre.findMany({ where: { slug: { in: tasteGenres } }, select: { id: true, slug: true } });
      const missing = tasteGenres.filter((s) => !rows.some((r) => r.slug === s));
      if (missing.length) throw new BadRequestException(`Bilinmeyen tür: ${missing.join(', ')}`);
      genres = rows.map((r) => ({ id: r.id }));
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { ...data, ...(genres ? { tasteGenres: { set: genres } } : {}) },
    });
    return this.me(userId);
  }

  /** KVKK silme: hesap hemen kapanır, 30 gün içinde aynı yöntemle giriş yapılırsa geri gelir. */
  async softDelete(userId: string) {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { deletedAt: now } }),
      this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } }),
      this.prisma.pushToken.deleteMany({ where: { userId } }),
    ]);
    return { ok: true, purgeAfter: new Date(now.getTime() + DELETE_GRACE_DAYS * DAY_MS) };
  }

  /**
   * Süresi dolan silme taleplerini anonimleştirir: kimlik, iletişim, cihaz ve bildirim verisi silinir.
   * Takip/kaydet satırları kimliksiz kullanıcıya bağlı kalır (yalnız toplam sayılar için).
   */
  async purgeDeleted(now = new Date()) {
    const due = await this.prisma.user.findMany({
      where: { deletedAt: { lt: new Date(now.getTime() - DELETE_GRACE_DAYS * DAY_MS) }, purgedAt: null },
      select: { id: true },
      take: 200,
    });
    for (const { id } of due) {
      await this.prisma.$transaction([
        this.prisma.authIdentity.deleteMany({ where: { userId: id } }),
        this.prisma.session.deleteMany({ where: { userId: id } }),
        this.prisma.pushToken.deleteMany({ where: { userId: id } }),
        this.prisma.notification.deleteMany({ where: { userId: id } }),
        this.prisma.notificationPref.deleteMany({ where: { userId: id } }),
        this.prisma.favoriteStation.deleteMany({ where: { userId: id } }),
        this.prisma.user.update({
          where: { id },
          data: { email: null, name: null, avatarUrl: null, birthYear: null, tasteGenres: { set: [] }, purgedAt: now },
        }),
      ]);
    }
    return due.length;
  }

  /** KVKK: kişisel verilerin tamamı tek JSON. */
  async export(userId: string) {
    const data = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...meSelect,
        identities: { select: { provider: true, createdAt: true } },
        consents: { orderBy: { createdAt: 'asc' }, select: { kind: true, version: true, granted: true, createdAt: true } },
        artistFollows: { select: { notifyOnRadio: true, createdAt: true, artist: { select: { slug: true, name: true } } } },
        venueFollows: { select: { createdAt: true, venue: { select: { slug: true, name: true } } } },
        saves: { select: { status: true, createdAt: true, event: { select: { slug: true, title: true, startsAt: true } } } },
        favStations: { select: { name: true, streamUrl: true, genreSlug: true, createdAt: true } },
        notificationPref: {
          select: {
            artistNewEvent: true,
            venueNewEvent: true,
            artistOnRadio: true,
            eventReminder: true,
            weeklyDigest: true,
            marketing: true,
            quietStart: true,
            quietEnd: true,
          },
        },
        notifications: { orderBy: { createdAt: 'desc' }, take: 500, select: { kind: true, title: true, body: true, createdAt: true, readAt: true } },
        pushTokens: { select: { platform: true, createdAt: true, lastSeenAt: true } },
        sessions: { select: { userAgent: true, createdAt: true, expiresAt: true, revokedAt: true } },
      },
    });
    if (!data) throw new NotFoundException('Kullanıcı bulunamadı');
    return { exportedAt: new Date(), ...data };
  }

  /** Her türün geçerli (en son) onayı. */
  async consents(userId: string) {
    const rows = await this.prisma.consent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { kind: true, version: true, granted: true, createdAt: true },
    });
    const latest = new Map<ConsentKind, (typeof rows)[number]>();
    for (const r of rows) if (!latest.has(r.kind)) latest.set(r.kind, r);
    return [...latest.values()];
  }

  async addConsent(userId: string, dto: ConsentDto) {
    await this.prisma.consent.create({ data: { userId, ...dto } });
    // Pazarlama rızası geri alınınca pazarlama bildirimleri de kapanır.
    if (dto.kind === 'ACIK_RIZA_PAZARLAMA' && !dto.granted) {
      await this.prisma.notificationPref.updateMany({ where: { userId }, data: { marketing: false } });
    }
    return this.consents(userId);
  }

  async hasConsent(userId: string, kind: ConsentKind) {
    const last = await this.prisma.consent.findFirst({ where: { userId, kind }, orderBy: { createdAt: 'desc' }, select: { granted: true } });
    return last?.granted ?? false;
  }
}
