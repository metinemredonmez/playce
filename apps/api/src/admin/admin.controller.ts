import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators';
import { Audit } from '../audit/audit.decorator';
import { AdminService } from './admin.service';
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

// İçerik yönetimi. Panel gelene kadar Swagger (/docs) üzerinden kullanılır.
// EDITOR+ rolü (JWT) ya da geçiş dönemi için X-Admin-Key. Her yazma AuditLog'a düşer.
@ApiTags('admin')
@ApiBearerAuth()
@ApiSecurity('admin-key')
@Roles('EDITOR')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Post('events') @Audit('event.create') createEvent(@Body() dto: CreateEventDto) { return this.admin.createEvent(dto); }
  @Patch('events/:slug') @Audit('event.update') updateEvent(@Param('slug') slug: string, @Body() dto: UpdateEventDto) { return this.admin.updateEvent(slug, dto); }
  @Delete('events/:slug') @Audit('event.delete') deleteEvent(@Param('slug') slug: string) { return this.admin.deleteEvent(slug); }

  @Post('venues') @Audit('venue.create') createVenue(@Body() dto: CreateVenueDto) { return this.admin.createVenue(dto); }
  @Patch('venues/:slug') @Audit('venue.update') updateVenue(@Param('slug') slug: string, @Body() dto: UpdateVenueDto) { return this.admin.updateVenue(slug, dto); }
  @Delete('venues/:slug') @Audit('venue.delete') deleteVenue(@Param('slug') slug: string) { return this.admin.deleteVenue(slug); }

  @Post('artists') @Audit('artist.create') createArtist(@Body() dto: CreateArtistDto) { return this.admin.createArtist(dto); }
  @Patch('artists/:slug') @Audit('artist.update') updateArtist(@Param('slug') slug: string, @Body() dto: UpdateArtistDto) { return this.admin.updateArtist(slug, dto); }
  @Delete('artists/:slug') @Audit('artist.delete') deleteArtist(@Param('slug') slug: string) { return this.admin.deleteArtist(slug); }

  @Post('stations') @Audit('station.create') createStation(@Body() dto: CreateStationDto) { return this.admin.createStation(dto); }
  @Patch('stations/:slug') @Audit('station.update') updateStation(@Param('slug') slug: string, @Body() dto: UpdateStationDto) { return this.admin.updateStation(slug, dto); }
  @Delete('stations/:slug') @Audit('station.delete') deleteStation(@Param('slug') slug: string) { return this.admin.deleteStation(slug); }
}
