import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

let app: any;

export default async function handler(req: any, res: any) {
  if (!app) {
    const nestApp = await NestFactory.create(AppModule);

    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    nestApp.enableCors({
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

    await nestApp.init();
    app = nestApp.getHttpAdapter().getInstance();
  }

  app(req, res);
}
