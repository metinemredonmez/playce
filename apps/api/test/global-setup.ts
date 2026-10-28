import { execSync } from 'child_process';
import { join } from 'path';
import { testDatabaseUrl } from './db-url';

// Test veritabanını sıfırdan kur (yoksa oluşturur) ve tüm migration'ları uygula.
export default function globalSetup() {
  execSync('npx prisma migrate reset --force --skip-seed --skip-generate', {
    cwd: join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'pipe',
  });
}
