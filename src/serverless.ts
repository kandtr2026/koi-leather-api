import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import serverless from 'serverless-http';
import { AppModule } from './app.module';

let handlerFn: any;

export async function handler(req: any, res: any) {
  if (!handlerFn) {
    const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });

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
        'https://koileather.vn',
        'https://admin.koileather.vn',
        'https://koileather.vercel.app',
      ],
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
      credentials: true,
    });

    const config = new DocumentBuilder()
      .setTitle('Koi Leather API')
      .setDescription('Headless Backend API for Koi Leather')
      .setVersion('1.0')
      .addTag('Products')
      .addTag('Media')
      .addServer('https://api.koileather.vn', 'Production')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { defaultModelsExpandDepth: -1, docExpansion: 'list' },
    });

    await app.init();
    handlerFn = serverless(app.getHttpAdapter().getInstance());
  }

  return handlerFn(req, res);
}
