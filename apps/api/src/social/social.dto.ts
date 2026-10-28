import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SaveStatus } from '@prisma/client';
import { SLUG_PATTERN } from '../common/text';

export class FollowArtistDto {
  @ApiPropertyOptional({ description: 'Radyoda çaldığında haber ver (varsayılan açık)' })
  @IsOptional() @IsBoolean() notifyOnRadio?: boolean;
}

export class SaveEventDto {
  @ApiPropertyOptional({ enum: SaveStatus, default: SaveStatus.INTERESTED })
  @IsOptional() @IsEnum(SaveStatus) status?: SaveStatus;
}

export class SavesQuery {
  @ApiPropertyOptional({ enum: ['upcoming', 'past'], default: 'upcoming' })
  @IsOptional() @IsIn(['upcoming', 'past']) when?: 'upcoming' | 'past';
}

export class FavStationDto {
  @ApiProperty() @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(500) streamUrl: string;
  @ApiProperty() @IsString() @MaxLength(120) name: string;
  @ApiPropertyOptional() @IsOptional() @Matches(SLUG_PATTERN) genreSlug?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() @MaxLength(500) logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasMetadata?: boolean;
}

export class StationUrlQuery {
  @ApiProperty() @IsUrl({ protocols: ['https'], require_protocol: true }) url: string;
}

/** Girişten önce cihazda tutulan favoriler hesaba taşınır. Bilinmeyen slug'lar sessizce atlanır. */
export class MergeDeviceDto {
  @ApiPropertyOptional({ type: [FavStationDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => FavStationDto) stations?: FavStationDto[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(200) @Matches(SLUG_PATTERN, { each: true }) venues?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(200) @Matches(SLUG_PATTERN, { each: true }) artists?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(200) @Matches(SLUG_PATTERN, { each: true }) events?: string[];
}
