import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ParseIntPipe,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { AlertService } from './alert.service';
import { CurrentUser, FirebaseAuthGuard } from '@bringup/auth';
import {
  type FirebaseUser,
  INotificationResponse,
  IMarkReadResponse,
  IPaginatedNotificationsResponse,
  ALERT_PAGINATION_DEFAULTS,
} from '@bringup/shared';

/**
 * Controller for managing user notifications
 * All routes require Firebase authentication
 */
@Controller('notifications')
@UseGuards(FirebaseAuthGuard)
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  /**
   * Get notifications for the authenticated user with pagination
   * @param user - Current authenticated user
   * @param limit - Maximum number of notifications to return (default: 50)
   * @param unreadOnly - Filter to only unread notifications (default: false)
   * @param cursor - Pagination cursor (last notification ID from previous page)
   */
  @Get()
  async getMyNotifications(
    @CurrentUser() user: FirebaseUser,
    @Query(
      'limit',
      new DefaultValuePipe(ALERT_PAGINATION_DEFAULTS.DEFAULT_LIMIT),
      ParseIntPipe,
    )
    limit: number,
    @Query('unreadOnly', new DefaultValuePipe(false), ParseBoolPipe)
    unreadOnly: boolean,
    @Query('cursor') cursor?: string,
  ): Promise<IPaginatedNotificationsResponse> {
    return this.alertService.getUserNotifications(user.uid, {
      limit,
      unreadOnly,
      cursor,
    });
  }

  /**
   * Get count of unread notifications for the authenticated user
   * @param user - Current authenticated user
   */
  @Get('unread-count')
  async getUnreadCount(
    @CurrentUser() user: FirebaseUser,
  ): Promise<{ count: number }> {
    const count = await this.alertService.getUnreadCount(user.uid);
    return { count };
  }

  /**
   * Get a single notification by ID
   * @param notificationId - The notification ID
   */
  @Get(':id')
  async getNotificationById(
    @Param('id') notificationId: string,
  ): Promise<INotificationResponse> {
    const notification =
      await this.alertService.getNotificationById(notificationId);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  /**
   * Mark a single notification as read
   * @param notificationId - The notification ID
   */
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id') notificationId: string,
  ): Promise<IMarkReadResponse> {
    return this.alertService.markNotificationAsRead(notificationId);
  }

  /**
   * Mark all notifications as read for the authenticated user
   * @param user - Current authenticated user
   */
  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(
    @CurrentUser() user: FirebaseUser,
  ): Promise<IMarkReadResponse> {
    return this.alertService.markAllNotificationsAsRead(user.uid);
  }

  /**
   * Delete a single notification
   * @param notificationId - The notification ID
   * @param user - Current authenticated user
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteNotification(
    @Param('id') notificationId: string,
    @CurrentUser() user: FirebaseUser,
  ): Promise<IMarkReadResponse> {
    return this.alertService.deleteNotification(notificationId, user.uid);
  }
}
