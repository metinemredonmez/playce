import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const lowerTrim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class OtpRequestDto {
  @ApiProperty({ example: 'deniz@ornek.com' }) @Transform(lowerTrim) @IsEmail() @MaxLength(254) email: string;
}

export class OtpVerifyDto extends OtpRequestDto {
  @ApiProperty({ example: '123456' }) @Matches(/^\d{6}$/, { message: 'Kod 6 haneli olmalı' }) code: string;
}

export class AppleSignInDto {
  @ApiProperty() @IsString() @MaxLength(4096) identityToken: string;
  @ApiPropertyOptional({ description: "Ham nonce; uygulama Apple'a sha256(nonce) vermiş olmalı" })
  @IsOptional() @IsString() @MaxLength(128) nonce?: string;
  @ApiPropertyOptional({ description: 'Apple adı yalnız ilk girişte uygulamaya verir' })
  @IsOptional() @IsString() @MaxLength(60) name?: string;
}

export class GoogleSignInDto {
  @ApiProperty() @IsString() @MaxLength(4096) idToken: string;
}

export class RefreshDto {
  @ApiProperty() @IsString() @MaxLength(200) refreshToken: string;
}

export class LogoutDto {
  @ApiPropertyOptional({ description: 'Bu cihazın push token’ı hesaptan ayrılır' })
  @IsOptional() @IsString() @MaxLength(200) pushToken?: string;
}
