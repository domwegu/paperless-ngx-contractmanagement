import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Globales Prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // CORS (für Dev)
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // Swagger Docs
  const config = new DocumentBuilder()
    .setTitle('Vertragsverwaltung API')
    .setDescription('API für die Vertragsverwaltung mit Paperless-NGX Integration')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.APP_PORT || 3000);
  console.log(`🚀 Backend läuft auf Port ${process.env.APP_PORT || 3000}`);
  console.log(`📖 Swagger Docs: http://localhost:${process.env.APP_PORT || 3000}/api/docs`);
}
bootstrap();
