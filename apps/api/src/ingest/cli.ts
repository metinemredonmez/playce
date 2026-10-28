/**
 * Elle içe aktarma: `pnpm ingest <etkinlikio|ticketmaster> [--dry-run]`
 * --dry-run hiçbir şey yazmaz, kaç etkinliğin geleceğini sayar (ör. Ticketmaster'da Biletix verisi var mı?).
 */
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExternalSource } from '@prisma/client';
import { validateEnv } from '../config/env';
import { PrismaModule } from '../prisma/prisma.module';
import { IngestModule } from './ingest.module';
import { IngestService } from './ingest.service';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), PrismaModule, IngestModule] })
class IngestCliModule {}

async function main() {
  const [name, flag] = process.argv.slice(2);
  const source = (name ?? '').toUpperCase() as ExternalSource;
  const app = await NestFactory.createApplicationContext(IngestCliModule, { logger: ['log', 'warn', 'error'] });
  try {
    const run = await app.get(IngestService).run(source, { dryRun: flag === '--dry-run' });
    console.log(JSON.stringify(run, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exitCode = 1;
});
