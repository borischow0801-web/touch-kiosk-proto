import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const corsOrigin = process.env.CORS_ORIGIN;

  // In production, CORS_ORIGIN must be explicitly configured — no * fallback
  if (nodeEnv === 'production' && !corsOrigin) {
    Logger.error(
      'CORS_ORIGIN environment variable is required in production. Refusing to start.',
      'Bootstrap',
    );
    process.exit(1);
  }

  app.enableCors({
    origin: corsOrigin ?? '*',
    methods: ['GET', 'POST'],
  });

  // Disable X-Powered-By to avoid leaking server info
  const expressApp = app.getHttpAdapter().getInstance() as {
    disable: (k: string) => void;
  };
  expressApp.disable('x-powered-by');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`Backend running on http://0.0.0.0:${port}`, 'Bootstrap');
}

bootstrap();
