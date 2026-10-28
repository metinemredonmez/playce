import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ArtistsService } from '../artists/artists.service';
import { PlaylogService } from '../playlog/playlog.service';
import { slugify } from '../common/text';
import { ticketProviderFor } from '../common/tickets';
import { AuthUser, hasRole } from '../auth/decorators';
import { alcoholFlags } from '../moderation/alcohol';
import { openStatus, weekFromMonday } from '../venues/hours';
import {
  AdminEventsQuery,
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

  // ---- etkinlik ----
  async listEvents(q: AdminEventsQuery) {
    const take = q.limit ?? 50;
    const rows = await this.prisma.event.findMany({
      where: { status: q.status },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: take + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        source: true,
        startsAt: true,
        description: true,
        sellerName: true,
        totalPriceNote: true,
        refundPolicy: true,
        venue: { select: { slug: true, name: true } },
      },
    });
    const items = rows.slice(0, take).map(({ description, sellerName, totalPriceNote, refundPolicy, ...e }) => ({
      ...e,
      flags: alcoholFlags(e.title, description, sellerName, totalPriceNote, refundPolicy),
    }));
    return { items, nextCursor: rows.length > take ? items[items.length - 1].id : null };
  }

  async createEvent(dto: CreateEventDto, user: AuthUser) {
    const { venueSlug, genreSlugs, artistSlugs, slug, allowFlagged, ...data } = dto;
    const { flags, blocked } = this.moderation(EVENT_TEXT.map((f) => dto[f]), allowFlagged, user);
    const held = blocked && (dto.status ?? 'PUBLISHED') === 'PUBLISHED';
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
      select: { status: true, title: true, description: true, sellerName: true, totalPriceNote: true, refundPolicy: true },
    });
    if (!current) throw new NotFoundException('Etkinlik bulunamadı');
    const { flags, blocked } = this.moderation(
      EVENT_TEXT.map((f) => (dto[f] !== undefined ? dto[f] : current[f])),
      allowFlagged,
      user,
    );
    // Yalnız metin değiştiyse ya da yayına alınıyorsa yeniden denetle (onaylı içerik fiyat güncellemesinde geri düşmesin).
    const status: EventStatus = dto.status ?? current.status;
    const touched = EVENT_TEXT.some((f) => dto[f] !== undefined) || (dto.status === 'PUBLISHED' && current.status !== 'PUBLISHED');
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
