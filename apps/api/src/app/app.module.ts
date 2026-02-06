import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from '@bringup/logger';
import { AppConfigModule } from '@bringup/config';

import { DatabaseModule } from '@bringup/database';
import { AuthModule } from '@bringup/auth';
import { AlertModule } from '@bringup/alert';
import { TasksModule } from '@bringup/tasks';
@Module({
  imports: [LoggerModule,AppConfigModule,DatabaseModule,AuthModule,AlertModule,TasksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
