import { Module } from '@nestjs/common';
import { AlertController } from './alert.controller';
import { AlertService } from './alert.service';
import { DatabaseModule } from '@bringup/database';

/**
 * Alert Module
 * Provides push notification and notification management functionality
 *
 * Features:
 * - Send push notifications via Expo
 * - Store and manage notification records in Firestore
 * - Mark notifications as read
 * - Query user notifications
 * - Cleanup old notifications
 */
@Module({
  imports: [DatabaseModule],
  controllers: [AlertController],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}
