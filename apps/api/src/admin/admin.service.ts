import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ArtistsService } from '../artists/artists.service';
import { PlaylogService } from '../playlog/playlog.service';
import { ticketProviderFor } from '../common/tickets';
import { AuthUser, hasRole } from '../auth/decorators';
import { alcoholFlags } from '../moderation/alcohol';
import { openStatus, weekFromMonday } from '../venues/hours';
import { DEFAULT_EVENT_HOURS, HOUR_MS, trTodayWindow } from '../common/time';
import { normalize, slugify } from '../common/text';
import { endedWhere, notEndedWhere } from '../events/events.service';
import { findDuplicateEvents } from '../events/duplicates';
import {
  AdminEventsQuery,
  CheckEventDto,
  CreateArtistDto,
  CreateEventDto,
  CreateStationDto,
  CreateVenueDto,
  UpdateArtistDto,
  UpdateEventDto,
  UpdateStationDto,
  UpdateVenueDto,
  VenueHoursDto,
} from './admin.dto';

/** Alkol denetiminden geçen metin alanları */
const EVENT_TEXT = ['title', 'description', 'sellerName', 'totalPriceNote', 'refundPolicy'] as const;
const VENUE_TEXT = ['name', 'description', 'doorPolicy', 'dressCode'] as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly artists: ArtistsService,
    private readonly playlog: PlaylogService,
  ) {}

  // ---- yardımcılar ----
  private async genreIds(slugs?: string[]) {
    if (!slugs) return undefined;
    const rows = await this.prisma.genre.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
    const missing = slugs.filter((s) => !rows.some((r) => r.slug === s));
    if (missing.length) throw new BadRequestException(`Bilinmeyen tür: ${missing.join(', ')}`);
    return rows.map((r) => ({ id: r.id }));
  }

  private async artistIds(slugs: string[]) {
    const rows = await this.prisma.artist.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
    const missing = slugs.filter((s) => !rows.some((r) => r.slug === s));
    if (missing.length) throw new BadRequestException(`Bilinmeyen sanatçı: ${missing.join(', ')}`);
    return slugs.map((s, sort) => ({ artistId: rows.find((r) => r.slug === s)!.id, sort }));
  }

  private async venueId(slug: string) {
    const v = await this.prisma.venue.findUnique({ where: { slug }, select: { id: true } });
    if (!v) throw new BadRequestException(`Bilinmeyen mekân: ${slug}`);
    return v.id;
  }

  /** Türetilen alanlar: ücretsiz bayrağı fiyattan, bilet satıcısı linkten (açıkça verilmedilerse). */
  private eventDerived(dto: UpdateEventDto) {
    return {
      ...(dto.isFree === undefined && dto.priceFrom !== undefined ? { isFree: dto.priceFrom === 0 } : {}),
      ...(dto.ticketProvider === undefined && dto.ticketUrl !== undefined ? { ticketProvider: ticketProviderFor(dto.ticketUrl) } : {}),
    };
  }

  /** Saat sırası (04 §4.2): kapı ≤ başlangıç < bitiş. Yayına alınan etkinlik bitmemiş olmalı. */
  private checkTimes(t: { startsAt: Date; endsAt: Date | null; doorsAt: Date | null }, publishing: boolean) {
    if (t.endsAt && t.endsAt <= t.startsAt) throw new BadRequestException('Bitiş, başlangıçtan sonra olmalı');
    if (t.doorsAt && t.doorsAt > t.startsAt) throw new BadRequestException('Kapı açılışı başlangıçtan sonra olamaz');
    const end = t.endsAt ?? new Date(t.startsAt.getTime() + DEFAULT_EVENT_HOURS * HOUR_MS);
    if (publishing && end < new Date()) throw new BadRequestException('Bitmiş etkinlik yayınlanamaz');
  }

  /**
   * Alkol mevzuatı ön denetimi (ADR-015). İşaretli etkinlik yayına çıkmaz, REVIEW'da bekler;
   * MODERATOR+ `allowFlagged` ile geçirebilir (istek gövdesi denetim kaydına düşer).
   */
  private moderation(texts: (string | null | undefined)[], allowFlagged: boolean | undefined, user: AuthUser) {
    if (allowFlagged && !hasRole(user.role, 'MODERATOR')) throw new ForbiddenException('allowFlagged için MODERATOR rolü gerekli');
    const flags = alcoholFlags(...texts);
    return { flags, blocked: flags.length > 0 && !allowFlagged };
  }

  private notFound(e: unknown, what: string): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') throw new NotFoundException(`${what} bulunamadı`);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new BadRequestException('Bu slug zaten kullanılıyor');
    throw e;
  }

  /** Panel menü rozetleri: bekleyen işler */
  async queues() {
    const [reviewEvents, unmatchedOpen, stationsDown] = await Promise.all([
      this.prisma.event.count({ where: { status: 'REVIEW' } }),
      this.prisma.unmatchedArtist.count({ where: { status: 'OPEN' } }),
      this.prisma.station.count({ where: { status: 'DOWN' } }),
    ]);
    return { reviewEvents, unmatchedOpen, stationsDown };
  }

  // ---- etkinlik ----
  /** Liste süzgeci (durum hariç: durum sekmelerinin sayıları bu süzgeçle hesaplanır). */
  private eventFilter(q: AdminEventsQuery, now: Date): Prisma.EventWhereInput {
    const and: Prisma.EventWhereInput[] = [];
    if (q.when === 'today' || q.when === 'week') {
      const { from, to } = trTodayWindow(now);
      and.push({ startsAt: { gte: from, lt: q.when === 'today' ? to : new Date(from.getTime() + 7 * 24 * HOUR_MS) } });
    }
    if (q.when === 'upcoming') and.push(notEndedWhere(now));
    if (q.when === 'past') and.push(endedWhere(now));
    const text = q.q ? normalize(q.q) : '';
    if (text) and.push({ OR: [{ searchText: { contains: text } }, { venue: { searchText: { contains: text } } }] });
    if (q.genre) and.push({ genres: { some: { slug: q.genre } } });
    if (q.venue) and.push({ venue: { slug: q.venue } });
    if (q.source) and.push({ source: q.source });
    if (q.missing === 'cover') and.push({ coverUrl: null });
    if (q.missing === 'ticket') and.push({ ticketUrl: null, isFree: false });
    return { AND: and };
  }

  /**
   * Panel listesi ve moderasyon kuyruğu → { items, nextCursor, counts }.
   * Bitmişler yeniden eskiye, diğerleri başlangıca göre. counts = süzgeçteki durum dağılımı (sekme rozetleri).
   */
  async listEvents(q: AdminEventsQuery) {
    const take = q.limit ?? 50;
    const base = this.eventFilter(q, new Date());
    const dir = q.when === 'past' ? ('desc' as const) : ('asc' as const);
    const [rows, byStatus] = await Promise.all([
      this.prisma.event.findMany({
        where: { AND: [base, q.status ? { status: q.status } : {}] },
        orderBy: [{ startsAt: dir }, { id: dir }],
        take: take + 1,
        ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          source: true,
          startsAt: true,
          endsAt: true,
          coverUrl: true,
          description: true,
          sellerName: true,
          totalPriceNote: true,
          refundPolicy: true,
          ticketUrl: true,
          priceFrom: true,
          isFree: true,
          venue: { select: { slug: true, name: true } },
          genres: { select: { slug: true, name: true, color: true }, orderBy: { sort: 'asc' } },
          _count: { select: { saves: true } },
        },
      }),
      this.prisma.event.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
    ]);
    // Metin alanları da döner: moderasyon ekranı düzeltip yeniden yayınlar.
    const items = rows.slice(0, take).map(({ _count, ...e }) => ({
      ...e,
      saves: _count.saves,
      flags: alcoholFlags(...EVENT_TEXT.map((f) => e[f])),
    }));
    const counts = Object.fromEntries(byStatus.map((g) => [g.status, g._count._all])) as Partial<Record<EventStatus, number>>;
    return { items, nextCursor: rows.length > take ? items[items.length - 1].id : null, counts };
  }

  /** Düzenleme formu için tam kayıt: lineup sırasıyla, kaydetme sayısı, dış kaynak bağlantıları. */
  async getEvent(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        coverUrl: true,
        startsAt: true,
        endsAt: true,
        doorsAt: true,
        priceFrom: true,
        currency: true,
        isFree: true,
        ageLimit: true,
        ticketUrl: true,
        ticketProvider: true,
        sellerName: true,
        totalPriceNote: true,
        refundPolicy: true,
        status: true,
        source: true,
        fanoutAt: true,
        createdAt: true,
        updatedAt: true,
        venue: { select: { slug: true, name: true, district: true, ageLimit: true } },
        genres: { select: { slug: true, name: true, color: true }, orderBy: { sort: 'asc' } },
        artists: { orderBy: { sort: 'asc' }, select: { artist: { select: { slug: true, name: true, imageUrl: true } } } },
        _count: { select: { saves: true } },
      },
    });
    if (!event) throw new NotFoundException('Etkinlik bulunamadı');
    const refs = await this.prisma.externalRef.findMany({
      where: { entityType: 'event', entityId: event.id },
      select: { source: true, externalId: true, url: true, syncedAt: true },
    });
    const { _count, artists, ...rest } = event;
    return {
      ...rest,
      artists: artists.map((a) => a.artist),
      saves: _count.saves,
      refs,
      flags: alcoholFlags(...EVENT_TEXT.map((f) => event[f])),
    };
  }

  /** Formun kaydetmeden önceki uyarıları: alkol denetimi bayrakları ve olası kopyalar (aynı mekân, ±2 saat, benzer başlık). */
  async checkEvent(dto: CheckEventDto) {
    const flags = alcoholFlags(...EVENT_TEXT.map((f) => dto[f]));
    if (!dto.venueSlug || !dto.startsAt || !dto.title?.trim()) return { flags, duplicates: [] };
    const [venue, self] = await Promise.all([
      this.prisma.venue.findUnique({ where: { slug: dto.venueSlug }, select: { id: true } }),
      dto.exclude ? this.prisma.event.findUnique({ where: { slug: dto.exclude }, select: { id: true } }) : null,
    ]);
    if (!venue) return { flags, duplicates: [] };
    const found = await findDuplicateEvents(this.prisma, { venueId: venue.id, startsAt: new Date(dto.startsAt), title: dto.title, excludeId: self?.id });
    return { flags, duplicates: found.map(({ id: _id, ...d }) => d) };
  }

  async createEvent(dto: CreateEventDto, user: AuthUser) {
    const { venueSlug, genreSlugs, artistSlugs, slug, allowFlagged, ...data } = dto;
    const date = (v?: string | null) => (v ? new Date(v) : null);
    const publishing = (dto.status ?? 'PUBLISHED') === 'PUBLISHED';
    this.checkTimes({ startsAt: new Date(dto.startsAt), endsAt: date(dto.endsAt), doorsAt: date(dto.doorsAt) }, publishing);
    const { flags, blocked } = this.moderation(EVENT_TEXT.map((f) => dto[f]), allowFlagged, user);
    const held = blocked && publishing;
    try {
      const event = await this.prisma.event.create({
        data: {
          ...data,
          ...this.eventDerived(dto),
          ...(held ? { status: 'REVIEW' as const } : {}),
          slug: slug ?? `${slugify(dto.title)}-${dto.startsAt.slice(0, 10)}`,
          venueId: await this.venueId(venueSlug),
          genres: { connect: await this.genreIds(genreSlugs ?? []) },
          artists: { create: await this.artistIds(artistSlugs ?? []) },
        },
      });
      return { ...event, moderation: flags.length ? { flags, held } : null };
    } catch (e) {
      this.notFound(e, 'Etkinlik');
    }
  }

  async updateEvent(slug: string, dto: UpdateEventDto, user: AuthUser) {
    const { venueSlug, genreSlugs, artistSlugs, allowFlagged, ...data } = dto;
    const current = await this.prisma.event.findUnique({
      where: { slug },
      select: {
        status: true,
        title: true,
        description: true,
        sellerName: true,
        totalPriceNote: true,
        refundPolicy: true,
        startsAt: true,
        endsAt: true,
        doorsAt: true,
      },
    });
    if (!current) throw new NotFoundException('Etkinlik bulunamadı');
    // Saatler yalnız değiştiyse ya da yayına alınıyorsa denetlenir (eski kayıt başka alan güncellemesinde takılmasın).
    const publishing = dto.status === 'PUBLISHED' && current.status !== 'PUBLISHED';
    if (publishing || dto.startsAt !== undefined || dto.endsAt !== undefined || dto.doorsAt !== undefined) {
      const date = (v: string | null | undefined, cur: Date | null) => (v === undefined ? cur : v === null ? null : new Date(v));
      this.checkTimes(
        { startsAt: date(dto.startsAt, current.startsAt)!, endsAt: date(dto.endsAt, current.endsAt), doorsAt: date(dto.doorsAt, current.doorsAt) },
        publishing,
      );
    }
    const { flags, blocked } = this.moderation(
      EVENT_TEXT.map((f) => (dto[f] !== undefined ? dto[f] : current[f])),
      allowFlagged,
      user,
    );
    // Yalnız metin değiştiyse ya da yayına alınıyorsa yeniden denetle (onaylı içerik fiyat güncellemesinde geri düşmesin).
    const status: EventStatus = dto.status ?? current.status;
    const touched = EVENT_TEXT.some((f) => dto[f] !== undefined) || publishing;
    const held = blocked && touched && status === 'PUBLISHED';
    try {
      const event = await this.prisma.$transaction(async (tx) => {
        const event = await tx.event.update({
          where: { slug },
          data: {
            ...data,
            ...this.eventDerived(dto),
            ...(held ? { status: 'REVIEW' as const } : {}),
            ...(venueSlug ? { venueId: await this.venueId(venueSlug) } : {}),
            ...(genreSlugs ? { genres: { set: await this.genreIds(genreSlugs) } } : {}),
          },
        });
        if (artistSlugs) {
          const lineup = await this.artistIds(artistSlugs);
          await tx.eventArtist.deleteMany({ where: { eventId: event.id } });
          await tx.eventArtist.createMany({ data: lineup.map((l) => ({ ...l, eventId: event.id })) });
        }
        return event;
      });
      return { ...event, moderation: flags.length ? { flags, held } : null };
    } catch (e) {
      this.notFound(e, 'Etkinlik');
    }
  }

  async deleteEvent(slug: string) {
    try {
      const { id } = await this.prisma.event.delete({ where: { slug } });
      return { ok: true, id };
    } catch (e) {
      this.notFound(e, 'Etkinlik');
    }
  }

  // ---- mekân ----
  /** Mekânın durumu yok (REVIEW'a düşemez): alkol denetimine takılan metin kaydedilmez. */
  private guardVenue(texts: (string | null | undefined)[], allowFlagged: boolean | undefined, user: AuthUser) {
    const { flags, blocked } = this.moderation(texts, allowFlagged, user);
    if (blocked) throw new BadRequestException({ message: 'Alkol mevzuatı (ADR-015): metinde promosyon ya da marka var', flags });
  }

  async createVenue(dto: CreateVenueDto, user: AuthUser) {
    const { genreSlugs, slug, allowFlagged, ...data } = dto;
    this.guardVenue(VENUE_TEXT.map((f) => dto[f]), allowFlagged, user);
    try {
      return await this.prisma.venue.create({
        data: { ...data, slug: slug ?? slugify(dto.name), genres: { connect: await this.genreIds(genreSlugs ?? []) } },
      });
    } catch (e) {
      this.notFound(e, 'Mekân');
    }
  }

  async updateVenue(slug: string, dto: UpdateVenueDto, user: AuthUser) {
    const { genreSlugs, allowFlagged, ...data } = dto;
    if (VENUE_TEXT.some((f) => dto[f] !== undefined)) {
      const current = await this.prisma.venue.findUnique({ where: { slug }, select: { name: true, description: true, doorPolicy: true, dressCode: true } });
      if (!current) throw new NotFoundException('Mekân bulunamadı');
      this.guardVenue(VENUE_TEXT.map((f) => (dto[f] !== undefined ? dto[f] : current[f])), allowFlagged, user);
    }
    try {
      return await this.prisma.venue.update({
        where: { slug },
        data: { ...data, ...(genreSlugs ? { genres: { set: await this.genreIds(genreSlugs) } } : {}) },
      });
    } catch (e) {
      this.notFound(e, 'Mekân');
    }
  }

  /** Haftalık saatleri baştan yazar (listede olmayan gün kapalı). */
  async setVenueHours(slug: string, dto: VenueHoursDto) {
    const days = dto.hours.map((h) => h.weekday);
    if (new Set(days).size !== days.length) throw new BadRequestException('Her gün en fazla bir kez');
    const venue = await this.prisma.venue.findUnique({ where: { slug }, select: { id: true } });
    if (!venue) throw new NotFoundException('Mekân bulunamadı');
    await this.prisma.$transaction([
      this.prisma.venueHours.deleteMany({ where: { venueId: venue.id } }),
      this.prisma.venueHours.createMany({ data: dto.hours.map((h) => ({ ...h, venueId: venue.id })) }),
    ]);
    const hours = await this.prisma.venueHours.findMany({ where: { venueId: venue.id }, select: { weekday: true, opensAt: true, closesAt: true } });
    return { id: venue.id, slug, hours: weekFromMonday(hours), ...openStatus(hours) };
  }

  async deleteVenue(slug: string) {
    try {
      const { id } = await this.prisma.venue.delete({ where: { slug } });
      return { ok: true, id };
    } catch (e) {
      this.notFound(e, 'Mekân');
    }
  }

  // ---- sanatçı ----
  async createArtist(dto: CreateArtistDto) {
    const { genreSlugs, slug, ...data } = dto;
    try {
      const a = await this.prisma.artist.create({
        data: { ...data, slug: slug ?? slugify(dto.name), genres: { connect: await this.genreIds(genreSlugs ?? []) } },
      });
      this.artists.invalidate();
      await this.playlog.autoLink(a.id);
      return a;
    } catch (e) {
      this.notFound(e, 'Sanatçı');
    }
  }

  async updateArtist(slug: string, dto: UpdateArtistDto) {
    const { genreSlugs, ...data } = dto;
    try {
      const a = await this.prisma.artist.update({
        where: { slug },
        data: { ...data, ...(genreSlugs ? { genres: { set: await this.genreIds(genreSlugs) } } : {}) },
      });
      this.artists.invalidate();
      await this.playlog.autoLink(a.id);
      return a;
    } catch (e) {
      this.notFound(e, 'Sanatçı');
    }
  }

  async deleteArtist(slug: string) {
    try {
      const { id } = await this.prisma.artist.delete({ where: { slug } });
      this.artists.invalidate();
      return { ok: true, id };
    } catch (e) {
      this.notFound(e, 'Sanatçı');
    }
  }

  // ---- istasyon ----
  private async genreId(slug: string) {
    const g = await this.prisma.genre.findUnique({ where: { slug }, select: { id: true } });
    if (!g) throw new BadRequestException(`Bilinmeyen tür: ${slug}`);
    return g.id;
  }

  async createStation(dto: CreateStationDto) {
    const { genreSlug, slug, ...data } = dto;
    try {
      return await this.prisma.station.create({
        data: { ...data, slug: slug ?? slugify(dto.name), genreId: await this.genreId(genreSlug) },
      });
    } catch (e) {
      this.notFound(e, 'İstasyon');
    }
  }

  async updateStation(slug: string, dto: UpdateStationDto) {
    const { genreSlug, ...data } = dto;
    try {
      return await this.prisma.station.update({
        where: { slug },
        data: { ...data, ...(genreSlug ? { genreId: await this.genreId(genreSlug) } : {}) },
      });
    } catch (e) {
      this.notFound(e, 'İstasyon');
    }
  }

  async deleteStation(slug: string) {
    try {
      const { id } = await this.prisma.station.delete({ where: { slug } });
      return { ok: true, id };
    } catch (e) {
      this.notFound(e, 'İstasyon');
    }
  }
}
