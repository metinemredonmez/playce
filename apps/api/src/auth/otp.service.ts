import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';

const CODE_TTL_MS = 10 * 60_000;
const RESEND_AFTER_MS = 60_000;
const MAX_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

/** E-posta ile 6 haneli giriş kodu: 60 sn'de 1, saatte 5 kod; 5 yanlış denemede kod iptal. */
@Injectable()
export class OtpService {
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    config: ConfigService<Env, true>,
  ) {
    this.secret = config.get('JWT_SECRET', { infer: true });
  }

  async request(email: string) {
    const now = Date.now();
    const recent = await this.prisma.otpCode.findMany({
      where: { email, createdAt: { gte: new Date(now - 60 * 60_000) } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    const wait = recent[0] ? RESEND_AFTER_MS - (now - recent[0].createdAt.getTime()) : 0;
    if (wait > 0) {
      throw new HttpException({ message: 'Yeni kod için biraz bekle', retryAfter: Math.ceil(wait / 1000) }, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (recent.length >= MAX_PER_HOUR) {
      throw new HttpException({ message: 'Çok fazla kod istendi. Bir saat sonra tekrar dene.' }, HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.$transaction([
      // Yalnız en son kod geçerli.
      this.prisma.otpCode.updateMany({ where: { email, consumedAt: null }, data: { consumedAt: new Date(now) } }),
      this.prisma.otpCode.create({ data: { email, codeHash: this.hash(email, code), expiresAt: new Date(now + CODE_TTL_MS) } }),
    ]);
    await this.mail.sendOtp(email, code);
    return { sent: true, expiresIn: CODE_TTL_MS / 1000, resendIn: RESEND_AFTER_MS / 1000 };
  }

  /** Kod doğruysa tüketir; değilse deneme sayar. */
  async verify(email: string, code: string): Promise<void> {
    const invalid = new BadRequestException('Kod geçersiz veya süresi doldu');
    const otp = await this.prisma.otpCode.findFirst({
      where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.attempts >= MAX_ATTEMPTS) throw invalid;

    const a = Buffer.from(otp.codeHash, 'hex');
    const b = Buffer.from(this.hash(email, code), 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      const { attempts } = await this.prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      const left = MAX_ATTEMPTS - attempts;
      if (left <= 0) {
        await this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
        throw new BadRequestException('Kod hatalı. Yeni kod iste.');
      }
      throw new BadRequestException(`Kod hatalı (${left} deneme hakkın kaldı)`);
    }

    // Tek kullanımlık: eşzamanlı ikinci doğrulama burada düşer.
    const { count } = await this.prisma.otpCode.updateMany({ where: { id: otp.id, consumedAt: null }, data: { consumedAt: new Date() } });
    if (!count) throw invalid;
  }

  // Kod kısa; sızan DB'den kaba kuvvetle çözülmesin diye sunucu sırrıyla HMAC.
  private hash(email: string, code: string) {
    return createHmac('sha256', this.secret).update(`otp:${email}:${code}`).digest('hex');
  }
}
