import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ArtistsService } from '../artists/artists.service';
import { PlaylogService } from '../playlog/playlog.service';
import { slugify } from '../common/text';
import {
  CreateArtistDto,
  CreateEventDto,
  CreateStationDto,
  CreateVenueDto,
  UpdateArtistDto,
  UpdateEventDto,
  UpdateStationDto,
  UpdateVenueDto,
} from './admin.dto';

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

  private notFound(e: unknown, what: string): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') throw new NotFoundException(`${what} bulunamadı`);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new BadRequestException('Bu slug zaten kullanılıyor');
    throw e;
  }

  // ---- etkinlik ----
  async createEvent(dto: CreateEventDto) {
    const { venueSlug, genreSlugs, artistSlugs, slug, ...data } = dto;
    try {
      return await this.prisma.event.create({
        data: {
          ...data,
          slug: slug ?? `${slugify(dto.title)}-${dto.startsAt.slice(0, 10)}`,
          venueId: await this.venueId(venueSlug),
          genres: { connect: await this.genreIds(genreSlugs ?? []) },
          artists: { create: await this.artistIds(artistSlugs ?? []) },
        },
      });
    } catch (e) {
      this.notFound(e, 'Etkinlik');
    }
  }

  async updateEvent(slug: string, dto: UpdateEventDto) {
    const { venueSlug, genreSlugs, artistSlugs, ...data } = dto;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const event = await tx.event.update({
          where: { slug },
          data: {
            ...data,
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
    } catch (e) {
      this.notFound(e, 'Etkinlik');
    }
  }

  async deleteEvent(slug: string) {
    try {
      await this.prisma.event.delete({ where: { slug } });
      return { ok: true };
    } catch (e) {
      this.notFound(e, 'Etkinlik');
    }
  }

  // ---- mekân ----
  async createVenue(dto: CreateVenueDto) {
    const { genreSlugs, slug, ...data } = dto;
    try {
      return await this.prisma.venue.create({
        data: { ...data, slug: slug ?? slugify(dto.name), genres: { connect: await this.genreIds(genreSlugs ?? []) } },
      });
    } catch (e) {
      this.notFound(e, 'Mekân');
    }
  }

  async updateVenue(slug: string, dto: UpdateVenueDto) {
    const { genreSlugs, ...data } = dto;
    try {
      return await this.prisma.venue.update({
        where: { slug },
        data: { ...data, ...(genreSlugs ? { genres: { set: await this.genreIds(genreSlugs) } } : {}) },
      });
    } catch (e) {
      this.notFound(e, 'Mekân');
    }
  }

  async deleteVenue(slug: string) {
    try {
      await this.prisma.venue.delete({ where: { slug } });
      return { ok: true };
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
      await this.prisma.artist.delete({ where: { slug } });
      this.artists.invalidate();
      return { ok: true };
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
      await this.prisma.station.delete({ where: { slug } });
      return { ok: true };
    } catch (e) {
      this.notFound(e, 'İstasyon');
    }
  }
}
