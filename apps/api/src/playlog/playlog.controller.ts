import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { UnmatchedStatus } from '@prisma/client';
import { Public, Roles } from '../auth/decorators';
import { SLUG_PATTERN } from '../common/text';
import { PlaylogService } from './playlog.service';

class UnmatchedQuery {
  @IsOptional() @IsEnum(UnmatchedStatus) status?: UnmatchedStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

class LinkDto {
  @Matches(SLUG_PATTERN) artistSlug: string;
}

class CreateFromUnmatchedDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @Matches(SLUG_PATTERN) slug?: string;
}

@ApiTags('stations')
@Public()
@Controller('stations')
export class StationPlaysController {
  constructor(private readonly playlog: PlaylogService) {}

  @Get(':slug/plays')
  @ApiQuery({ name: 'limit', required: false })
  plays(@Param('slug') slug: string, @Query('limit') limit?: string) {
    return this.playlog.stationPlays(slug, Number(limit) || 20);
  }
}

// Radyoda çalan ama veritabanında olmayan sanatçılar. En çok çalan en üstte.
@ApiTags('admin')
@ApiBearerAuth()
@ApiSecurity('admin-key')
@Roles('EDITOR')
@Controller('admin/unmatched')
export class UnmatchedController {
  constructor(private readonly playlog: PlaylogService) {}

  @Get()
  list(@Query() q: UnmatchedQuery) {
    return this.playlog.unmatched(q.status, q.limit);
  }

  @Post(':key/link')
  @HttpCode(200)
  link(@Param('key') key: string, @Body() dto: LinkDto) {
    return this.playlog.link(key, dto.artistSlug);
  }

  @Post(':key/create')
  create(@Param('key') key: string, @Body() dto: CreateFromUnmatchedDto) {
    return this.playlog.createArtist(key, dto.name, dto.slug);
  }

  @Post(':key/ignore')
  @HttpCode(200)
  ignore(@Param('key') key: string) {
    return this.playlog.ignore(key);
  }
}
