import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

// /admin/* uçları: X-Admin-Key başlığı .env'deki ADMIN_KEY ile eşleşmeli.
// Kullanıcı hesapları gelene kadar basit, tek anahtarlı koruma.
@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const expected = this.config.get<string>('ADMIN_KEY');
    const given = ctx.switchToHttp().getRequest().headers['x-admin-key'];
    if (!expected || typeof given !== 'string') throw new UnauthorizedException();
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException();
    return true;
  }
}
