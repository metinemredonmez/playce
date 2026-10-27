import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { StationsService } from './stations.service';

@ApiTags('stations')
@Controller()
export class StationsController {
  constructor(private readonly stations: StationsService) {}

  @Get('genres/:slug/stations')
  @ApiQuery({ name: 'more', required: false, description: 'radio-browser ek istasyonları da getir' })
  byGenre(@Param('slug') slug: string, @Query('more') more?: string) {
    return this.stations.byGenre(slug, more === 'true' || more === '1');
  }

  @Get('stations/search')
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'country', required: false })
  search(@Query('q') q?: string, @Query('tag') tag?: string, @Query('country') country?: string) {
    return this.stations.search({ q: q?.trim() || undefined, tag: tag?.trim() || undefined, country: country?.trim() || undefined });
  }
}
