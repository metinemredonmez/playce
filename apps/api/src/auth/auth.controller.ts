import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { AppleSignInDto, GoogleSignInDto, LogoutDto, OtpRequestDto, OtpVerifyDto, RefreshDto } from './auth.dto';
import { AuthService } from './auth.service';
import { AuthUser, CurrentUser, Public } from './decorators';
import { IdTokenVerifier } from './id-token.verifier';
import { OtpService } from './otp.service';
import { TokenService } from './tokens.service';

const STRICT = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly otp: OtpService,
    private readonly idTokens: IdTokenVerifier,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Throttle(STRICT)
  @Post('otp/request')
  @HttpCode(200)
  requestOtp(@Body() dto: OtpRequestDto) {
    return this.otp.request(dto.email);
  }

  @Public()
  @Throttle(STRICT)
  @Post('otp/verify')
  @HttpCode(200)
  async verifyOtp(@Body() dto: OtpVerifyDto, @Headers('user-agent') ua?: string) {
    await this.otp.verify(dto.email, dto.code);
    return this.auth.signIn('EMAIL', { subject: dto.email, email: dto.email, emailVerified: true }, ua);
  }

  @Public()
  @Throttle(STRICT)
  @Post('apple')
  @HttpCode(200)
  async apple(@Body() dto: AppleSignInDto, @Headers('user-agent') ua?: string) {
    const identity = await this.idTokens.apple(dto.identityToken, dto.nonce);
    return this.auth.signIn('APPLE', { ...identity, name: dto.name?.trim() || null }, ua);
  }

  @Public()
  @Throttle(STRICT)
  @Post('google')
  @HttpCode(200)
  async google(@Body() dto: GoogleSignInDto, @Headers('user-agent') ua?: string) {
    return this.auth.signIn('GOOGLE', await this.idTokens.google(dto.idToken), ua);
  }

  @Public()
  @Throttle(STRICT)
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto, @Headers('user-agent') ua?: string) {
    return this.tokens.rotate(dto.refreshToken, ua);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentUser() user: AuthUser, @Body() dto: LogoutDto) {
    if (user.sessionId) await this.tokens.revoke(user.sessionId);
    if (dto.pushToken) await this.prisma.pushToken.updateMany({ where: { token: dto.pushToken, userId: user.id }, data: { userId: null } });
    return { ok: true };
  }
}
