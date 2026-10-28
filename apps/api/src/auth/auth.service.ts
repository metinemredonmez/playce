import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthProvider, Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { VerifiedIdentity } from './id-token.verifier';
import { TokenService } from './tokens.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
  ) {}

  /** Doğrulanmış kimlikle giriş: hesap yoksa açılır, silme süresindeyse geri gelir. */
  async signIn(provider: AuthProvider, identity: VerifiedIdentity, userAgent?: string) {
    const { user, isNew } = await this.findOrCreate(provider, identity).catch((e) => {
      // Aynı anda iki ilk giriş: ikincisi benzersizlik hatası alır, kaydı bulup devam eder.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return this.findOrCreate(provider, identity);
      throw e;
    });
    if (user.bannedAt) throw new ForbiddenException('Hesap askıya alındı');
    if (user.deletedAt) await this.prisma.user.update({ where: { id: user.id }, data: { deletedAt: null } });

    const tokens = await this.tokens.issue(user.id, userAgent);
    return { ...tokens, isNew, user: await this.users.me(user.id) };
  }

  private async findOrCreate(provider: AuthProvider, id: VerifiedIdentity): Promise<{ user: User; isNew: boolean }> {
    const known = await this.prisma.authIdentity.findUnique({
      where: { provider_subject: { provider, subject: id.subject } },
      include: { user: true },
    });
    if (known) return { user: known.user, isNew: false };

    const email = id.emailVerified ? id.email : null;
    // Doğrulanmış e-posta aynıysa aynı kişi: yeni giriş yöntemini mevcut hesaba bağla.
    if (email) {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) {
        await this.prisma.authIdentity.create({ data: { userId: existing.id, provider, subject: id.subject } });
        return { user: existing, isNew: false };
      }
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: id.name ?? null,
        avatarUrl: id.avatarUrl ?? null,
        identities: { create: { provider, subject: id.subject } },
        notificationPref: { create: {} },
      },
    });
    return { user, isNew: true };
  }
}
