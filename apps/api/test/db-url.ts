import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/** Testler ayrı veritabanında koşar: TEST_DATABASE_URL ya da .env'deki DATABASE_URL'in "_test" kopyası. */
export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const envFile = join(__dirname, '../.env');
  const m = existsSync(envFile) ? readFileSync(envFile, 'utf8').match(/^DATABASE_URL=(.+)$/m) : null;
  if (!m) throw new Error('TEST_DATABASE_URL tanımla (ya da apps/api/.env içinde DATABASE_URL olsun)');
  const url = new URL(m[1].trim());
  url.pathname = `${url.pathname.replace(/\/$/, '')}_test`;
  return url.toString();
}
