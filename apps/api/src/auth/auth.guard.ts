import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { Env } from '../config/env';
import { AuthUser, hasRole, IS_PUBLIC, MIN_ROLE } from './decorators';
import { TokenService } from './tokens.service';

type AuthedRequest = Request & { user?: AuthUser };

/**
 * Global kimlik kontrolü: her uç varsayılan olarak giriş ister, `@Public()` olanlar istemez.
 * Public uçta geçersiz/eski token hata vermez (gezinme bozulmasın), kullanıcı tanınmaz.
 * `@Roles()` olan uçlarda geçiş dönemi için X-Admin-Key de kabul edilir.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const targets = [ctx.getHandler(), ctx.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets) ?? false;
    const minRole = this.reflector.getAllAndOverride<Role | undefined>(MIN_ROLE, targets);

    const header = req.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (bearer) {
      try {
        req.user = await this.tokens.authenticate(bearer);
      } catch (e) {
        if (!isPublic) throw e;
      }
    }
    if (isPublic || req.user) return true;

    if (minRole && this.adminKeyOk(req.headers['x-admin-key'])) {
      req.user = { id: 'admin-key', role: 'SUPERADMIN', sessionId: null };
      return true;
    }
    throw new UnauthorizedException('Giriş gerekli');
  }

  private adminKeyOk(given: unknown): boolean {
    const expected = this.config.get('ADMIN_KEY', { infer: true });
    if (!expected || typeof given !== 'string') return false;
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const min = this.reflector.getAllAndOverride<Role | undefined>(MIN_ROLE, [ctx.getHandler(), ctx.getClass()]);
    if (!min) return true;
    const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
    if (!user) throw new UnauthorizedException('Giriş gerekli');
    if (!hasRole(user.role, min)) throw new ForbiddenException('Bu işlem için yetkin yok');
    return true;
  }
}
