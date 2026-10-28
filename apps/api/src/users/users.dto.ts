import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { ConsentKind } from '@prisma/client';
import { SLUG_PATTERN } from '../common/text';

/** MVP yalnız İstanbul (ADR: şehir genişlemesi Faz 7). */
export const CITIES = ['istanbul'] as const;

export class UpdateMeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) name?: string;
  @ApiPropertyOptional({ enum: CITIES }) @IsOptional() @IsIn(CITIES) city?: string;
  @ApiPropertyOptional({ enum: ['tr', 'en'] }) @IsOptional() @IsIn(['tr', 'en']) locale?: string;
  @ApiPropertyOptional({ description: 'Yalnız yıl — 18+ içerik kapısı için' })
  @IsOptional() @IsInt() @Min(1900) @Max(new Date().getUTCFullYear()) birthYear?: number;
  @ApiPropertyOptional({ type: [String], description: 'Zevk türleri (slug)' })
  @IsOptional() @IsArray() @ArrayMaxSize(15) @ArrayUnique() @Matches(SLUG_PATTERN, { each: true }) tasteGenres?: string[];
}

export class ConsentDto {
  @ApiProperty({ enum: ConsentKind }) @IsEnum(ConsentKind) kind: ConsentKind;
  @ApiProperty({ example: '2026-11-01', description: 'Onaylanan metnin sürümü' }) @Matches(/^\d{4}-\d{2}-\d{2}$/) version: string;
  @ApiProperty() @IsBoolean() granted: boolean;
}
