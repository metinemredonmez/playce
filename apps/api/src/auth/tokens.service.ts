import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from './decorators';

export const ACCESS_TTL_S = 15 * 60;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Uygulama aynı refresh'i iki kez yollarsa (iki paralel istek) hırsızlık sayma. */
const ROTATION_GRACE_MS = 30_000;

export type TokenPair = { accessToken: string; refreshToken: string; expiresIn: number };
type AccessPayload = { sub: string; sid: string };

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/**
 * Access token: 15 dk JWT (sub + oturum kimliği). Refresh token: rastgele, DB'de yalnız hash'i.
 * Her yenilemede refresh döner; bir önceki token tekrar gelirse çalınmış sayılır ve
 * kullanıcının tüm oturumları kapanır.
 */
@Injectable()
export class TokenService {
  private readonly log = new Logger('Auth');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async issue(userId: string, userAgent?: string): Promise<TokenPair> {
    const refresh = randomBytes(32).toString('base64url');
    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshHash: sha256(refresh),
        userAgent: userAgent?.slice(0, 200),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return this.pair(userId, session.id, refresh);
  }

  async rotate(refresh: string, userAgent?: string): Promise<TokenPair> {
    const hash = sha256(refresh);
    const now = new Date();
    const session = await this.prisma.session.findUnique({
      where: { refreshHash: hash },
      select: { id: true, userId: true, expiresAt: true, revokedAt: true, user: { select: { bannedAt: true, deletedAt: true } } },
    });

    if (session) {
      if (session.revokedAt || session.expiresAt < now) throw new UnauthorizedException('Oturum geçersiz');
      if (session.user.bannedAt) throw new ForbiddenException('Hesap askıya alındı');
      if (session.user.deletedAt) throw new UnauthorizedException('Hesap silindi');
      const next = randomBytes(32).toString('base64url');
      // Koşullu güncelleme: aynı token'la eşzamanlı ikinci istek burada düşer.
      const { count } = await this.prisma.session.updateMany({
        where: { id: session.id, refreshHash: hash, revokedAt: null },
        data: {
          refreshHash: sha256(next),
          prevHash: hash,
          rotatedAt: now,
          expiresAt: new Date(now.getTime() + REFRESH_TTL_MS),
          ...(userAgent ? { userAgent: userAgent.slice(0, 200) } : {}),
        },
      });
      if (!count) throw new UnauthorizedException('Oturum az önce yenilendi');
      return this.pair(session.userId, session.id, next);
    }

    const stale = await this.prisma.session.findUnique({ where: { prevHash: hash } });
    if (stale && !stale.revokedAt) {
      if (stale.rotatedAt && now.getTime() - stale.rotatedAt.getTime() < ROTATION_GRACE_MS) {
        throw new UnauthorizedException('Oturum az önce yenilendi');
      }
      await this.revokeAll(stale.userId);
      this.log.warn(`Eski refresh token tekrar kullanıldı — kullanıcının tüm oturumları kapatıldı (${stale.userId})`);
    }
    throw new UnauthorizedException('Oturum geçersiz');
  }

  /** Access token'ı doğrular. Rol ve oturum her istekte DB'den okunur: çıkış/ban anında etkili olur. */
  async authenticate(access: string): Promise<AuthUser> {
    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(access);
    } catch {
      throw new UnauthorizedException('Oturum süresi doldu');
    }
    const s = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      select: { userId: true, revokedAt: true, user: { select: { role: true, bannedAt: true, deletedAt: true } } },
    });
    if (!s || s.revokedAt || s.userId !== payload.sub || s.user.deletedAt) throw new UnauthorizedException('Oturum kapalı');
    if (s.user.bannedAt) throw new ForbiddenException('Hesap askıya alındı');
    return { id: s.userId, role: s.user.role as Role, sessionId: payload.sid };
  }

  async revoke(sessionId: string) {
    await this.prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async revokeAll(userId: string) {
    await this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  private async pair(userId: string, sid: string, refresh: string): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync({ sub: userId, sid } satisfies AccessPayload, { expiresIn: ACCESS_TTL_S });
    return { accessToken, refreshToken: refresh, expiresIn: ACCESS_TTL_S };
  }
}
