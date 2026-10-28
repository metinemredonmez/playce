import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule));

  const doc = new DocumentBuilder()
    .setTitle('Playce API')
    .setDescription('Müziği çal, mekânı bul — radyo + mekân + etkinlik. Tüm uçlar /v1 altında.')
    .setVersion('0.2.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Admin-Key', in: 'header' }, 'admin-key')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, doc));

  const port = Number(process.env.PORT) || 3030;
  await app.listen(port, '0.0.0.0');
  console.log(`Playce API → http://localhost:${port}/v1 (Swagger: /docs)`);
}
bootstrap();
