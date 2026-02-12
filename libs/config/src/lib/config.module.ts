/* eslint-disable @typescript-eslint/no-explicit-any */
import { Global, Module } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from './config.validation';
import { AppConfigService } from './config.service';

const env = process.env['NODE_ENV'];
const isProduction = env === 'production';

// In production (e.g., Render), env vars are injected via process.env
// In development, load from .env files
const envFilePath = path.resolve(
  process.cwd(),
  'libs/config/src/env',
  `${env}.env`,
);

// Check if env file exists (it won't in production deployments like Render)
const envFileExists = fs.existsSync(envFilePath);

// Update AppConfigModule
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // In production or when file doesn't exist, rely on process.env
      ignoreEnvFile: isProduction || !envFileExists,
      envFilePath: envFileExists ? envFilePath : undefined,
      cache: true,
      expandVariables: true,
      validate: (config: Record<string, unknown>) => {
        validateEnv(config as Record<string, any>);
        return config;
      },
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
