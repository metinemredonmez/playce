import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators';
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
// EDITOR+ rolü (JWT) ya da geçiş dönemi için X-Admin-Key.
@ApiTags('admin')
@ApiBearerAuth()
@ApiSecurity('admin-key')
@Roles('EDITOR')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Post('events') createEvent(@Body() dto: CreateEventDto) { return this.admin.createEvent(dto); }
  @Patch('events/:slug') updateEvent(@Param('slug') slug: string, @Body() dto: UpdateEventDto) { return this.admin.updateEvent(slug, dto); }
  @Delete('events/:slug') deleteEvent(@Param('slug') slug: string) { return this.admin.deleteEvent(slug); }

  @Post('venues') createVenue(@Body() dto: CreateVenueDto) { return this.admin.createVenue(dto); }
  @Patch('venues/:slug') updateVenue(@Param('slug') slug: string, @Body() dto: UpdateVenueDto) { return this.admin.updateVenue(slug, dto); }
  @Delete('venues/:slug') deleteVenue(@Param('slug') slug: string) { return this.admin.deleteVenue(slug); }

  @Post('artists') createArtist(@Body() dto: CreateArtistDto) { return this.admin.createArtist(dto); }
  @Patch('artists/:slug') updateArtist(@Param('slug') slug: string, @Body() dto: UpdateArtistDto) { return this.admin.updateArtist(slug, dto); }
  @Delete('artists/:slug') deleteArtist(@Param('slug') slug: string) { return this.admin.deleteArtist(slug); }

  @Post('stations') createStation(@Body() dto: CreateStationDto) { return this.admin.createStation(dto); }
  @Patch('stations/:slug') updateStation(@Param('slug') slug: string, @Body() dto: UpdateStationDto) { return this.admin.updateStation(slug, dto); }
  @Delete('stations/:slug') deleteStation(@Param('slug') slug: string) { return this.admin.deleteStation(slug); }
}
