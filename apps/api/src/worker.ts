import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { validateEnv } from './config/env';
import { JobsModule } from './jobs/jobs.module';
import { PrismaModule } from './prisma/prisma.module';

// Arka plan süreci (pm2: playce-worker): push gönderimi, fan-out, hatırlatma, radyo yoklayıcısı, istasyon sağlığı, gece temizliği.
// HTTP dinlemez. Tek kopya çalışmalı (işler DB'yi kilitlemeden okur).
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), ScheduleModule.forRoot(), PrismaModule, JobsModule],
})
class WorkerModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  new Logger('Worker').log('Playce worker çalışıyor');
}
bootstrap();
