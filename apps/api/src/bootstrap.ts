import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Express } from 'express';

/** main.ts ve e2e testleri aynı kurulumu kullanır. */
export function configureApp(app: INestApplication) {
  // nginx arkasında gerçek istemci IP'si (rate limit için).
  (app.getHttpAdapter().getInstance() as Express).set('trust proxy', 'loopback');
  app.enableCors();
  app.setGlobalPrefix('v1', { exclude: ['health'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
  return app;
}
