import { Inject, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { createRemoteJWKSet, JWTPayload, jwtVerify, JWTVerifyGetKey } from 'jose';
import { Env } from '../config/env';

export type IdProvider = 'APPLE' | 'GOOGLE';
export type JwksResolver = (provider: IdProvider) => JWTVerifyGetKey;
/** Testlerde yerel anahtar setiyle değiştirilir. */
export const JWKS_RESOLVER = Symbol('JWKS_RESOLVER');

export const remoteJwks = {
  provide: JWKS_RESOLVER,
  useFactory: (): JwksResolver => {
    // jose anahtarları önbellekler ve bilinmeyen "kid" gelince yeniden çeker.
    const apple = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
    const google = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
    return (p) => (p === 'APPLE' ? apple : google);
  },
};

export type VerifiedIdentity = {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name?: string | null;
  avatarUrl?: string | null;
};

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const truthy = (v: unknown) => v === true || v === 'true';

/** Apple / Google kimlik token'larını yayıncının açık anahtarlarıyla doğrular. */
@Injectable()
export class IdTokenVerifier {
  constructor(
    @Inject(JWKS_RESOLVER) private readonly jwks: JwksResolver,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * `nonce` gönderilirse: uygulama Apple'a sha256(nonce) vermiş olmalı; token'daki değerle karşılaştırılır
   * (tekrar oynatma koruması).
   */
  async apple(identityToken: string, nonce?: string): Promise<VerifiedIdentity> {
    const payload = await this.verify('APPLE', identityToken, {
      issuer: 'https://appleid.apple.com',
      audience: this.config.get('APPLE_AUDIENCES', { infer: true }),
    });
    if (nonce !== undefined && payload.nonce !== createHash('sha256').update(nonce).digest('hex')) {
      throw new UnauthorizedException('Apple doğrulaması başarısız');
    }
    return { subject: payload.sub!, email: str(payload.email)?.toLowerCase() ?? null, emailVerified: truthy(payload.email_verified) };
  }

  async google(idToken: string): Promise<VerifiedIdentity> {
    const audience = this.config.get('GOOGLE_CLIENT_IDS', { infer: true });
    if (!audience.length) throw new ServiceUnavailableException('Google ile giriş henüz açık değil');
    const payload = await this.verify('GOOGLE', idToken, { issuer: ['https://accounts.google.com', 'accounts.google.com'], audience });
    return {
      subject: payload.sub!,
      email: str(payload.email)?.toLowerCase() ?? null,
      emailVerified: truthy(payload.email_verified),
      name: str(payload.name),
      avatarUrl: str(payload.picture),
    };
  }

  private async verify(p: IdProvider, token: string, opts: { issuer: string | string[]; audience: string[] }): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, this.jwks(p), { ...opts, algorithms: ['RS256', 'ES256'] });
      if (!payload.sub) throw new Error('sub yok');
      return payload;
    } catch {
      throw new UnauthorizedException(`${p === 'APPLE' ? 'Apple' : 'Google'} doğrulaması başarısız`);
    }
  }
}
