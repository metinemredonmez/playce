import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { SLUG_PATTERN } from '../common/text';
import { When, WHENS } from '../common/time';

const toBool = ({ value }: { value: unknown }) => (value === 'true' || value === '1' ? true : value === 'false' || value === '0' ? false : value);

export const EVENT_SORTS = ['soonest', 'nearest'] as const;
export type EventSort = (typeof EVENT_SORTS)[number];

export class EventsQuery {
  @ApiPropertyOptional({ enum: WHENS, default: 'upcoming', description: 'from/to verilirse yok sayılır' })
  @IsOptional() @IsIn(WHENS) when?: When;
  @ApiPropertyOptional({ example: '2026-11-06', description: 'Tarih (İstanbul günü başı) ya da ISO an' })
  @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional({ example: '2026-11-09', description: 'Hariç' })
  @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(SLUG_PATTERN) genre?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(SLUG_PATTERN) venue?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(SLUG_PATTERN) artist?: string;
  @ApiPropertyOptional({ example: 'kadikoy', description: 'Semt slug ya da adı (GET /v1/districts)' })
  @IsOptional() @IsString() @MaxLength(60) district?: string;
  @ApiPropertyOptional({ description: 'Yalnız ücretsiz' }) @IsOptional() @Transform(toBool) @IsBoolean() free?: boolean;
  @ApiPropertyOptional({ description: 'Kuruş: 500 TL = 50000. Ücretsizler dahil, fiyatı bilinmeyenler hariç' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) priceMax?: number;
  @ApiPropertyOptional({ example: '41.0256,28.9739', description: 'lat,lng — yanıta distanceKm eklenir' })
  @IsOptional() @Matches(/^-?\d{1,2}(\.\d+)?,-?\d{1,3}(\.\d+)?$/) near?: string;
  @ApiPropertyOptional({ default: 5 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0.5) @Max(50) radiusKm?: number;
  @ApiPropertyOptional({ enum: EVENT_SORTS, description: 'nearest için near gerekir (near verilince varsayılan)' })
  @IsOptional() @IsIn(EVENT_SORTS) sort?: EventSort;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) cursor?: string;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
