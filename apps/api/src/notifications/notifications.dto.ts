import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class PushTokenDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @Matches(/^Expo(nent)?PushToken\[[^\]]{8,200}\]$/, { message: 'Geçersiz Expo push token' }) token: string;
  @ApiProperty() @IsString() @MaxLength(100) deviceId: string;
  @ApiProperty({ enum: ['ios', 'android'] }) @IsIn(['ios', 'android']) platform: 'ios' | 'android';
}

export class NotificationsQuery {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) cursor?: string;
  @ApiPropertyOptional({ default: 30 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

export class MarkReadDto {
  @ApiPropertyOptional({ type: [String], description: 'Boşsa hepsi okundu' })
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) ids?: string[];
}

export class UpdatePrefsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() artistNewEvent?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() venueNewEvent?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() artistOnRadio?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() eventReminder?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() weeklyDigest?: boolean;
  @ApiPropertyOptional({ description: 'ACIK_RIZA_PAZARLAMA onayı gerekir' }) @IsOptional() @IsBoolean() marketing?: boolean;
  @ApiPropertyOptional({ description: 'İstanbul saati 0–23' }) @IsOptional() @IsInt() @Min(0) @Max(23) quietStart?: number;
  @ApiPropertyOptional({ description: 'İstanbul saati 0–23 (başlangıçla aynıysa sessiz saat yok)' })
  @IsOptional() @IsInt() @Min(0) @Max(23) quietEnd?: number;
}
