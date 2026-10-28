import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GenresService } from './genres.service';
import { Public } from '../auth/decorators';

@ApiTags('genres')
@Public()
@Controller('genres')
export class GenresController {
  constructor(private readonly genres: GenresService) {}

  @Get()
  list() {
    return this.genres.list();
  }
}
