import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Roles } from '../auth/decorators';
import { Audit } from '../audit/audit.decorator';
import { SearchService } from '../search/search.service';
import { SearchQuery } from '../search/search.dto';
import { AdminService } from './admin.service';
import {
  AdminEventsQuery,
  AdminVenuesQuery,
  CheckEventDto,
  CheckVenueDto,
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

// İçerik yönetimi (apps/admin paneli; Swagger /docs da kullanılabilir).
// EDITOR+ rolü (JWT) ya da geçiş dönemi için X-Admin-Key. Her yazma AuditLog'a düşer.
@ApiTags('admin')
@ApiBearerAuth()
@ApiSecurity('admin-key')
@Roles('EDITOR')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly search: SearchService,
  ) {}

  /** Bekleyen iş sayıları (panel menü rozetleri) */
  @Get('queues') queues() { return this.admin.queues(); }

  /** Etkinlik listesi ve moderasyon kuyruğu (?status=REVIEW) — her öğede alkol denetimi bayrakları */
  @Get('events') listEvents(@Query() q: AdminEventsQuery) { return this.admin.listEvents(q); }
  /** Formda kaydetmeden önce: alkol denetimi + olası kopya. Yazmaz. */
  @Post('events/check') @HttpCode(200) checkEvent(@Body() dto: CheckEventDto) { return this.admin.checkEvent(dto); }
  @Get('events/:slug') getEvent(@Param('slug') slug: string) { return this.admin.getEvent(slug); }
  @Post('events') @Audit('event.create') createEvent(@Body() dto: CreateEventDto, @CurrentUser() user: AuthUser) { return this.admin.createEvent(dto, user); }
  @Patch('events/:slug') @Audit('event.update') updateEvent(@Param('slug') slug: string, @Body() dto: UpdateEventDto, @CurrentUser() user: AuthUser) { return this.admin.updateEvent(slug, dto, user); }
  @Delete('events/:slug') @Audit('event.delete') deleteEvent(@Param('slug') slug: string) { return this.admin.deleteEvent(slug); }

  /** Form seçicileri: Türkçe karakter ve yazım hatası duyarsız, en fazla 10 sonuç */
  @Get('lookup/venues') lookupVenues(@Query() q: SearchQuery) { return this.search.lookup('venue', q.q); }
  @Get('lookup/artists') lookupArtists(@Query() q: SearchQuery) { return this.search.lookup('artist', q.q); }

  /** Mekân listesi; missing = eksik alan sayıları (konum, saat, kapak) */
  @Get('venues') listVenues(@Query() q: AdminVenuesQuery) { return this.admin.listVenues(q); }
  /** Formda kaydetmeden önce: alkol denetimi + olası aynı mekân. Yazmaz. */
  @Post('venues/check') @HttpCode(200) checkVenue(@Body() dto: CheckVenueDto) { return this.admin.checkVenue(dto); }
  @Get('venues/:slug') getVenue(@Param('slug') slug: string) { return this.admin.getVenue(slug); }
  @Post('venues') @Audit('venue.create') createVenue(@Body() dto: CreateVenueDto, @CurrentUser() user: AuthUser) { return this.admin.createVenue(dto, user); }
  @Patch('venues/:slug') @Audit('venue.update') updateVenue(@Param('slug') slug: string, @Body() dto: UpdateVenueDto, @CurrentUser() user: AuthUser) { return this.admin.updateVenue(slug, dto, user); }
  @Put('venues/:slug/hours') @Audit('venue.hours') setVenueHours(@Param('slug') slug: string, @Body() dto: VenueHoursDto) { return this.admin.setVenueHours(slug, dto); }
  @Delete('venues/:slug') @Audit('venue.delete') deleteVenue(@Param('slug') slug: string) { return this.admin.deleteVenue(slug); }

  @Post('artists') @Audit('artist.create') createArtist(@Body() dto: CreateArtistDto) { return this.admin.createArtist(dto); }
  @Patch('artists/:slug') @Audit('artist.update') updateArtist(@Param('slug') slug: string, @Body() dto: UpdateArtistDto) { return this.admin.updateArtist(slug, dto); }
  @Delete('artists/:slug') @Audit('artist.delete') deleteArtist(@Param('slug') slug: string) { return this.admin.deleteArtist(slug); }

  @Post('stations') @Audit('station.create') createStation(@Body() dto: CreateStationDto) { return this.admin.createStation(dto); }
  @Patch('stations/:slug') @Audit('station.update') updateStation(@Param('slug') slug: string, @Body() dto: UpdateStationDto) { return this.admin.updateStation(slug, dto); }
  @Delete('stations/:slug') @Audit('station.delete') deleteStation(@Param('slug') slug: string) { return this.admin.deleteStation(slug); }
}
