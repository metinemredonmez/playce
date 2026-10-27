import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { VenuesService } from './venues.service';

@ApiTags('venues')
@Controller('venues')
export class VenuesController {
  constructor(private readonly venues: VenuesService) {}

  @Get()
  @ApiQuery({ name: 'genre', required: false })
  @ApiQuery({ name: 'district', required: false })
  list(@Query('genre') genre?: string, @Query('district') district?: string) {
    return this.venues.list({ genre: genre || undefined, district: district || undefined });
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.venues.get(slug);
  }
}
