import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { DiscoverService } from './discover.service';

@ApiTags('discover')
@Controller('discover')
export class DiscoverController {
  constructor(private readonly discover: DiscoverService) {}

  // Oynatıcının "Bu sesin canlısı" kartı tek çağrıda buradan beslenir.
  @Get('now')
  @ApiQuery({ name: 'url', required: true, description: 'Çalan yayının stream URL’i' })
  @ApiQuery({ name: 'genre', required: false, description: 'Dinlenen tür slug’ı' })
  now(@Query('url') url: string, @Query('genre') genre?: string) {
    return this.discover.now(url || '', genre || undefined);
  }
}
