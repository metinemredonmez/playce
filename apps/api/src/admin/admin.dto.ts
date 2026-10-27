import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EventStatus } from '@prisma/client';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateEventDto {
  @ApiProperty() @IsString() @MaxLength(140) title: string;
  @ApiPropertyOptional() @IsOptional() @Matches(SLUG) slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() coverUrl?: string;
  @ApiProperty({ example: '2026-11-01T21:00:00+03:00' }) @IsDateString() startsAt: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endsAt?: string;
  @ApiPropertyOptional({ description: 'Kuruş cinsinden. 450 TL = 45000' }) @IsOptional() @IsInt() @Min(0) priceFrom?: number;
  @ApiPropertyOptional() @IsOptional() @IsUrl() ticketUrl?: string;
  @ApiPropertyOptional({ enum: EventStatus }) @IsOptional() @IsEnum(EventStatus) status?: EventStatus;
  @ApiProperty() @Matches(SLUG) venueSlug: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayUnique() @Matches(SLUG, { each: true }) genreSlugs?: string[];
  @ApiPropertyOptional({ type: [String], description: 'Sıra = lineup sırası (ilk = headliner)' })
  @IsOptional() @IsArray() @ArrayUnique() @Matches(SLUG, { each: true }) artistSlugs?: string[];
}
export class UpdateEventDto extends PartialType(CreateEventDto) {}

export class CreateVenueDto {
  @ApiProperty() @IsString() @MaxLength(120) name: string;
  @ApiPropertyOptional() @IsOptional() @Matches(SLUG) slug?: string;
  @ApiProperty({ example: 'Karaköy' }) @IsString() @MaxLength(60) district: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsLatitude() lat?: number;
  @ApiPropertyOptional() @IsOptional() @IsLongitude() lng?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() coverUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) instagram?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(4) priceLevel?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayUnique() @Matches(SLUG, { each: true }) genreSlugs?: string[];
}
export class UpdateVenueDto extends PartialType(CreateVenueDto) {}

export class CreateArtistDto {
  @ApiProperty() @IsString() @MaxLength(120) name: string;
  @ApiPropertyOptional() @IsOptional() @Matches(SLUG) slug?: string;
  @ApiPropertyOptional({ type: [String], description: 'Radyo başlığındaki farklı yazılışlar' })
  @IsOptional() @IsArray() @IsString({ each: true }) aliases?: string[];
  @ApiPropertyOptional() @IsOptional() @IsUrl() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayUnique() @Matches(SLUG, { each: true }) genreSlugs?: string[];
}
export class UpdateArtistDto extends PartialType(CreateArtistDto) {}

export class CreateStationDto {
  @ApiProperty() @IsString() @MaxLength(80) name: string;
  @ApiPropertyOptional() @IsOptional() @Matches(SLUG) slug?: string;
  @ApiProperty({ description: 'HTTPS yayın adresi' }) @IsUrl({ protocols: ['https'], require_protocol: true }) streamUrl: string;
  @ApiProperty() @Matches(SLUG) genreSlug: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() homepage?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2) country?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasMetadata?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() sort?: number;
}
export class UpdateStationDto extends PartialType(CreateStationDto) {}
