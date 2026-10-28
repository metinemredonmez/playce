import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
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
  ValidateNested,
} from 'class-validator';
import { DataSource, EventStatus, ExternalSource } from '@prisma/client';
import { SLUG_PATTERN as SLUG } from '../common/text';
import { HHMM } from '../venues/hours';

export class CreateEventDto {
  @ApiProperty() @IsString() @MaxLength(140) title: string;
  @ApiPropertyOptional() @IsOptional() @Matches(SLUG) slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() coverUrl?: string;
  @ApiProperty({ example: '2026-11-01T21:00:00+03:00' }) @IsDateString() startsAt: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endsAt?: string;
  @ApiPropertyOptional({ description: 'Kapı açılış saati' }) @IsOptional() @IsDateString() doorsAt?: string;
  @ApiPropertyOptional({ description: 'Kuruş cinsinden. 450 TL = 45000' }) @IsOptional() @IsInt() @Min(0) priceFrom?: number;
  @ApiPropertyOptional({ description: 'Verilmezse priceFrom = 0 ise true' }) @IsOptional() @IsBoolean() isFree?: boolean;
  @ApiPropertyOptional({ description: '18 = gece hayatı (ADR-015)' }) @IsOptional() @IsInt() @Min(0) @Max(25) ageLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsUrl() ticketUrl?: string;
  @ApiPropertyOptional({ enum: ExternalSource, description: 'Verilmezse ticketUrl adresinden çıkarılır' })
  @IsOptional() @IsEnum(ExternalSource) ticketProvider?: ExternalSource;
  @ApiPropertyOptional({ example: 'Bubilet / Organizatör A.Ş.' }) @IsOptional() @IsString() @MaxLength(120) sellerName?: string;
  @ApiPropertyOptional({ example: 'Hizmet bedeli dahil' }) @IsOptional() @IsString() @MaxLength(200) totalPriceNote?: string;
  @ApiPropertyOptional({ example: 'Etkinlik iptalinde tam iade; kullanıcı kaynaklı iade yok' })
  @IsOptional() @IsString() @MaxLength(500) refundPolicy?: string;
  @ApiPropertyOptional({ enum: EventStatus, description: 'REVIEW = moderasyon bekliyor (uygulamada görünmez). Alkol denetimine takılan metin PUBLISHED istense de REVIEW olur' })
  @IsOptional() @IsEnum(EventStatus) status?: EventStatus;
  @ApiPropertyOptional({ description: 'Alkol denetimine takılan metni yine de yayınla (MODERATOR+; denetim kaydına geçer)' })
  @IsOptional() @IsBoolean() allowFlagged?: boolean;
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
  @ApiPropertyOptional({ description: '18 = gece kulübü' }) @IsOptional() @IsInt() @Min(0) @Max(25) ageLimit?: number;
  @ApiPropertyOptional({ example: 'Seçici kapı, kimlik zorunlu' }) @IsOptional() @IsString() @MaxLength(200) doorPolicy?: string;
  @ApiPropertyOptional({ example: 'Spor ayakkabı kabul' }) @IsOptional() @IsString() @MaxLength(200) dressCode?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayUnique() @Matches(SLUG, { each: true }) genreSlugs?: string[];
  @ApiPropertyOptional({ description: 'Alkol denetimine takılan metni yine de kaydet (MODERATOR+)' })
  @IsOptional() @IsBoolean() allowFlagged?: boolean;
}
export class UpdateVenueDto extends PartialType(CreateVenueDto) {}

export class VenueHourDto {
  @ApiProperty({ description: '0 = Pazar … 6 = Cumartesi' }) @IsInt() @Min(0) @Max(6) weekday: number;
  @ApiProperty({ example: '23:00' }) @Matches(HHMM) opensAt: string;
  @ApiProperty({ example: '05:00', description: 'Açılıştan küçük/eşitse ertesi gün' }) @Matches(HHMM) closesAt: string;
}

export class VenueHoursDto {
  @ApiProperty({ type: [VenueHourDto], description: 'Haftanın tamamı; listede olmayan gün kapalı. Boş liste = saat bilgisi yok' })
  @IsArray() @ArrayMaxSize(7) @ValidateNested({ each: true }) @Type(() => VenueHourDto) hours: VenueHourDto[];
}

export const ADMIN_WHENS = ['today', 'week', 'upcoming', 'past'] as const;
export type AdminWhen = (typeof ADMIN_WHENS)[number];
export const MISSING = ['cover', 'ticket'] as const;

export class AdminEventsQuery {
  @ApiPropertyOptional({ enum: EventStatus, example: 'REVIEW' }) @IsOptional() @IsEnum(EventStatus) status?: EventStatus;
  @ApiPropertyOptional({ enum: ADMIN_WHENS, description: 'Verilmezse tüm tarihler. past = bitmiş (yeniden eskiye)' })
  @IsOptional() @IsIn(ADMIN_WHENS) when?: AdminWhen;
  @ApiPropertyOptional({ description: 'Başlık ya da mekân adı (Türkçe karakter duyarsız)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional() @IsString() @MaxLength(60) q?: string;
  @ApiPropertyOptional({ description: 'Tür slug' }) @IsOptional() @Matches(SLUG) genre?: string;
  @ApiPropertyOptional({ description: 'Mekân slug' }) @IsOptional() @Matches(SLUG) venue?: string;
  @ApiPropertyOptional({ enum: DataSource }) @IsOptional() @IsEnum(DataSource) source?: DataSource;
  @ApiPropertyOptional({ enum: MISSING, description: 'cover = kapağı yok, ticket = ücretli ama bilet linki yok' })
  @IsOptional() @IsIn(MISSING) missing?: (typeof MISSING)[number];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) cursor?: string;
  @ApiPropertyOptional({ default: 50 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

/** Formda kaydetmeden önce: alkol denetimi ve olası kopya (aynı mekân, ±2 saat, benzer başlık). */
export class CheckEventDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(140) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) sellerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) totalPriceNote?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) refundPolicy?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(SLUG) venueSlug?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional({ description: 'Düzenlenen etkinlik (kendisi kopya sayılmasın)' }) @IsOptional() @Matches(SLUG) exclude?: string;
}

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
