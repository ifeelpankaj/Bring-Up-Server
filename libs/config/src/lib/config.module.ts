/* eslint-disable @typescript-eslint/no-explicit-any */
import { Global, Module } from '@nestjs/common';
import * as path from 'path';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from './config.validation';
import { AppConfigService } from './config.service';

const env = process.env['NODE_ENV'];

const envFilePath = path.resolve(
  process.cwd(),
  'libs/config/src/env',
  `${env}.env`
);

// Update AppConfigModule
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
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
