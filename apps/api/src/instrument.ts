// Hata takibi (Sentry). main.ts ve worker.ts'te ilk import olmalı. SENTRY_DSN yoksa hiçbir şey yapmaz.
// .env'i ConfigModule sonra okur; DSN'i burada erken almak için dosyaya kendimiz bakıyoruz.
import * as Sentry from '@sentry/nestjs';
import { readFileSync } from 'fs';
import { parseEnv } from 'util';

function fromEnvFile(key: string): string | undefined {
  try {
    return parseEnv(readFileSync('.env', 'utf8'))[key] || undefined;
  } catch {
    return undefined;
  }
}

const dsn = process.env.SENTRY_DSN || fromEnvFile('SENTRY_DSN');
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0,
    // KVKK: kullanıcı, çerez, başlık, sorgu, gövde, SQL verisi ve yerel değişkenler gönderilmez; yalnız hata ve yığın izi.
    // (SDK 11 varsayılanı bunların çoğunu toplar.)
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      stackFrameVariables: false,
    },
  });
}
