import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { VenuesService } from './venues.service';
import { Public } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { districts } from './districts';

@ApiTags('venues')
@Public()
@Controller('venues')
export class VenuesController {
  constructor(private readonly venues: VenuesService) {}

  @Get()
  @ApiQuery({ name: 'genre', required: false })
  @ApiQuery({ name: 'district', required: false, description: 'Semt slug ya da adı' })
  @ApiQuery({ name: 'openNow', required: false, description: 'Yalnız şu an açık olanlar (1/true)' })
  list(@Query('genre') genre?: string, @Query('district') district?: string, @Query('openNow') openNow?: string) {
    return this.venues.list({ genre: genre || undefined, district: district || undefined, openNow: openNow === '1' || openNow === 'true' });
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.venues.get(slug);
  }
}

@ApiTags('venues')
@Public()
@Controller('districts')
export class DistrictsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Filtre için semtler: [{ slug, name, venues }] — mekân sayısına göre. */
  @Get()
  list() {
    return districts(this.prisma);
  }
}
