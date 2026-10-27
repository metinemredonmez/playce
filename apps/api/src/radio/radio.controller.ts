import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RadioService } from './radio.service';

@ApiTags('radio')
@Controller('radio')
export class RadioController {
  constructor(private readonly radio: RadioService) {}

  // Canlı yayında o anki parça (ICY StreamTitle). Yoksa alanlar null.
  @Get('now-playing')
  nowPlaying(@Query('url') url: string) {
    return this.radio.nowPlaying(url || '');
  }
}
