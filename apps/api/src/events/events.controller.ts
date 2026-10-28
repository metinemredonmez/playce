import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common';
import { ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { EventsService } from './events.service';
import { EventsQuery } from './events.dto';
import { Public } from '../auth/decorators';

@ApiTags('events')
@Public()
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  /** { items, nextCursor } — sonraki sayfa için ?cursor=<nextCursor> */
  @Get()
  list(@Query() q: EventsQuery) {
    return this.events.list(q);
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.events.get(slug);
  }

  /** Takvime ekle */
  @Get(':slug/ics')
  @ApiProduces('text/calendar')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  async ics(@Param('slug') slug: string, @Res({ passthrough: true }) res: Response) {
    const { slug: name, body } = await this.events.ics(slug);
    res.setHeader('Content-Disposition', `attachment; filename="${name}.ics"`);
    return body;
  }
}
