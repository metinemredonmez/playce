import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { exportJWK, generateKeyPair, createLocalJWKSet, SignJWT, KeyLike } from 'jose';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { JWKS_RESOLVER } from '../src/auth/id-token.verifier';
import { MailService } from '../src/auth/mail.service';
import { ExpoMessage, ExpoPushClient, ExpoReceipt, ExpoTicket } from '../src/notifications/expo-push.client';
import { JobsModule } from '../src/jobs/jobs.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RadioService, Track } from '../src/radio/radio.service';

export const ADMIN_KEY = process.env.ADMIN_KEY!;

/** Gönderilen giriş kodlarını yakalar. */
export class MailStub {
  codes = new Map<string, string>();
  async sendOtp(email: string, code: string) {
    this.codes.set(email, code);
  }
}

/** Expo yerine: "Dead" içeren token'lar DeviceNotRegistered döner. */
export class ExpoStub {
  sent: ExpoMessage[] = [];
  fail = false;
  receiptsResult: Record<string, ExpoReceipt> = {};
  private n = 0;
  async send(messages: ExpoMessage[]): Promise<ExpoTicket[]> {
    if (this.fail) throw new Error('ağ hatası');
    this.sent.push(...messages);
    return messages.map((m) =>
      m.to.includes('Dead')
        ? { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } }
        : { status: 'ok', id: `ticket-${++this.n}` },
    );
  }
  async receipts(ids: string[]) {
    return Object.fromEntries(ids.map((id) => [id, this.receiptsResult[id] ?? { status: 'ok' }]));
  }
}

/** Yayın okumak yerine istasyon URL'sine göre sabit başlık döner. */
export class RadioStub {
  tracks = new Map<string, Track>();
  async nowPlaying(url: string): Promise<Track> {
    return this.tracks.get(url) ?? { raw: null, artist: null, title: null };
  }
}

/** Apple/Google yerine yerel RSA anahtarıyla imzalanan kimlik token'ları. */
export class IdTokenSigner {
  private constructor(
    private readonly key: KeyLike,
    readonly jwks: ReturnType<typeof createLocalJWKSet>,
  ) {}

  static async create() {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'test', alg: 'RS256' };
    return new IdTokenSigner(privateKey, createLocalJWKSet({ keys: [jwk] }));
  }

  sign(claims: Record<string, unknown>, opts: { iss: string; aud: string; sub: string }) {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setIssuer(opts.iss)
      .setAudience(opts.aud)
      .setSubject(opts.sub)
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(this.key);
  }
}

export type TestContext = {
  app: INestApplication;
  prisma: PrismaService;
  mail: MailStub;
  expo: ExpoStub;
  radio: RadioStub;
  signer: IdTokenSigner;
  http: () => ReturnType<typeof request>;
  get<T>(type: new (...args: never[]) => T): T;
};

export async function createTestApp(): Promise<TestContext> {
  const mail = new MailStub();
  const expo = new ExpoStub();
  const radio = new RadioStub();
  const signer = await IdTokenSigner.create();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule, JobsModule] })
    .overrideProvider(MailService)
    .useValue(mail)
    .overrideProvider(ExpoPushClient)
    .useValue(expo)
    .overrideProvider(RadioService)
    .useValue(radio)
    .overrideProvider(JWKS_RESOLVER)
    .useValue(() => signer.jwks)
    .compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  return {
    app,
    prisma: app.get(PrismaService),
    mail,
    expo,
    radio,
    signer,
    http: () => request(app.getHttpServer()),
    get: (type) => app.get(type),
  };
}

/** Migration tablosu hariç her şeyi boşalt. */
export async function resetDb(prisma: PrismaService) {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
}

const HOUR = 60 * 60 * 1000;

/** Küçük, öngörülebilir veri seti: 1 tür, 2 sanatçı, 1 mekân, 1 istasyon, 2 gelecek + 1 geçmiş etkinlik. */
export async function seedBasics(prisma: PrismaService) {
  const rock = await prisma.genre.create({ data: { slug: 'rock', name: 'Rock', color: '#f00', radioTag: 'rock' } });
  const duman = await prisma.artist.create({ data: { slug: 'duman', name: 'Duman', aliases: ['DUMAN'], genres: { connect: { id: rock.id } } } });
  const manga = await prisma.artist.create({ data: { slug: 'manga', name: 'maNga' } });
  const venue = await prisma.venue.create({ data: { slug: 'blind', name: 'Blind', district: 'Beyoğlu', genres: { connect: { id: rock.id } } } });
  const station = await prisma.station.create({
    data: { slug: 'rock-fm', name: 'Rock FM', streamUrl: 'https://stream.example.com/rock', genreId: rock.id },
  });
  const now = Date.now();
  const mkEvent = (slug: string, startsInH: number, artistId: string) =>
    prisma.event.create({
      data: {
        slug,
        title: slug,
        startsAt: new Date(now + startsInH * HOUR),
        endsAt: new Date(now + (startsInH + 4) * HOUR),
        venueId: venue.id,
        fanoutAt: new Date(),
        genres: { connect: { id: rock.id } },
        artists: { create: { artistId } },
      },
    });
  const soon = await mkEvent('duman-blind', 2, duman.id);
  const later = await mkEvent('manga-blind', 72, manga.id);
  const past = await mkEvent('eski-konser', -48, duman.id);
  return { rock, duman, manga, venue, station, events: { soon, later, past } };
}

/** E-posta kodu ile giriş yapar, token'ları döner. */
export async function login(ctx: TestContext, email: string) {
  await ctx.prisma.otpCode.deleteMany({ where: { email } }); // 60 sn bekleme kuralına takılmasın
  await ctx.http().post('/v1/auth/otp/request').send({ email }).expect(200);
  const res = await ctx
    .http()
    .post('/v1/auth/otp/verify')
    .send({ email, code: ctx.mail.codes.get(email) })
    .expect(200);
  return res.body as { accessToken: string; refreshToken: string; isNew: boolean; user: { id: string } };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
