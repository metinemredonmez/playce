import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ArtistsService } from './artists.service';
import { Public } from '../auth/decorators';

@ApiTags('artists')
@Public()
@Controller('artists')
export class ArtistsController {
  constructor(private readonly artists: ArtistsService) {}

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.artists.get(slug);
  }
}
