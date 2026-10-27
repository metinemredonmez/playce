import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { When } from '../common/time';

const WHENS: When[] = ['tonight', 'weekend', 'upcoming'];

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @ApiQuery({ name: 'when', required: false, enum: WHENS })
  @ApiQuery({ name: 'genre', required: false })
  @ApiQuery({ name: 'venue', required: false })
  @ApiQuery({ name: 'artist', required: false })
  @ApiQuery({ name: 'limit', required: false })
  list(
    @Query('when') when?: string,
    @Query('genre') genre?: string,
    @Query('venue') venue?: string,
    @Query('artist') artist?: string,
    @Query('limit') limit?: string,
  ) {
    return this.events.list({
      when: WHENS.includes(when as When) ? (when as When) : 'upcoming',
      genre: genre || undefined,
      venue: venue || undefined,
      artist: artist || undefined,
      limit: limit ? Number(limit) || undefined : undefined,
    });
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.events.get(slug);
  }
}
