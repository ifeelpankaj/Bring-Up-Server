import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

import { ValidationPipe } from '@nestjs/common';
import { AppConfigService } from '@bringup/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppLogger, loggerConfig } from '@bringup/logger';
import { GlobalExceptionFilter } from '@bringup/utils';
import { FirebaseAuthGuard } from '@bringup/auth';
// Create a standalone Winston logger for bootstrap errors
const bootstrapLogger = winston.createLogger();

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: WinstonModule.createLogger(loggerConfig),
    });

    //Logger Configuration
    const logger = app.get(AppLogger);
    logger.forContext('Bootstrap');

    const globalPrefix = 'api/v1';
    app.setGlobalPrefix(globalPrefix);
    const config = app.get(AppConfigService);

    app.enableCors({
      credentials: true,
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => {
        if (!origin) return callback(null, true); // mobile / Postman

        if (config.appConfig.allowedOrigin.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
    });

    // Global pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Global filters and interceptors
    app.useGlobalFilters(new GlobalExceptionFilter(logger));
    app.useGlobalGuards(app.get(FirebaseAuthGuard));
    const port = config.appConfig.port;
    await app.listen(port, '0.0.0.0');

    logger.log(
      `✓ Application is running on: http://localhost:${port}/${globalPrefix}`,
    );
  } catch (error) {
    // Log startup errors to both console and file
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(
      `\n[Bootstrap] error: ✗ Application failed to start: ${errorMessage}\n`,
    );

    bootstrapLogger.error('Application failed to start', {
      context: 'Bootstrap',
      error: {
        message: errorMessage,
        stack: errorStack,
        name: error instanceof Error ? error.name : 'Error',
      },
    });

    // Give time for logs to be written
    await new Promise((resolve) => setTimeout(resolve, 1000));
    process.exit(1);
  }
}

bootstrap();
