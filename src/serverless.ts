import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as path from 'path';
import * as express from 'express';

let cachedServer: any;

async function bootstrapServer() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://koileather.com',
      'https://www.koileather.com',
      'https://koileather.vn',
      'https://www.koileather.vn',
      'https://admin.koileather.vn',
      'https://koileather.vercel.app',
    ],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    credentials: true,
  });

  app.use('/', express.static(path.join(process.cwd(), 'public')));
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  const config = new DocumentBuilder()
    .setTitle('Koi Leather API')
    .setDescription('Headless Backend API for Koi Leather')
    .setVersion('1.0')
    .addTag('KoiProducts')
    .addTag('Media')
    .addServer('https://api.koileather.vn', 'KoiProduction')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { defaultModelsExpandDepth: -1, docExpansion: 'list' },
  });

  await app.init();

  // Vercel Node functions call the handler with native (req, res). The Nest
  // Express adapter instance is itself an (req, res) handler, so we invoke it
  // directly — do NOT wrap with serverless-http (that expects Lambda events).
  return app.getHttpAdapter().getInstance();
}

export async function handler(req: any, res: any) {
  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }
  return cachedServer(req, res);
}
