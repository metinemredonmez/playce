import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators';
import { SearchQuery } from './search.dto';
import { SearchService } from './search.service';

@ApiTags('search')
@Public()
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  /** { artists, venues, events, stations } — her türden en fazla 5 (etkinlik 10). */
  @Get()
  find(@Query() { q }: SearchQuery) {
    return this.search.search(q);
  }
}
