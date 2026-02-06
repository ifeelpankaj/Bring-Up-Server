import { Inject, Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import {
  INotificationDocument,
  INotificationResponse,
  IPaginatedNotificationsResponse,
  NotificationType,
  NotificationStatus,
  ISendPushNotificationParams,
  ITaskAssignmentNotificationParams,
  ITaskReactionNotificationParams,
  IGetNotificationsOptions,
  IMarkReadResponse,
  ICleanupResponse,
  FIRESTORE_TOKEN,
  FirebaseUser,
  ALERT_COLLECTIONS,
  ALERT_PAGINATION_DEFAULTS,
  ALERT_RETENTION,
  ALERT_PUSH_CONFIG,
} from '@bringup/shared';

/**
 * Service for managing push notifications and notification records
 * Uses Expo Push Notifications and Firestore for persistence
 */
@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private readonly expo: Expo;

  constructor(
    @Inject(FIRESTORE_TOKEN)
    private readonly firestore: admin.firestore.Firestore,
  ) {
    this.expo = new Expo();
  }

  // ==========================================
  // PUBLIC NOTIFICATION SENDERS
  // ==========================================

  /**
   * Send notification when a task is assigned to a user
   */
  async sendTaskAssignmentNotification(
    params: ITaskAssignmentNotificationParams,
  ): Promise<void> {
    const { taskId, assigneeUid, creatorUid, creatorName, taskTitle } = params;

    await this.sendPushNotification({
      taskId,
      recipientUid: assigneeUid,
      senderUid: creatorUid,
      type: NotificationType.TASK_ASSIGNED,
      title: `New task from ${creatorName}`,
      body: taskTitle,
      dataType: NotificationType.TASK_ASSIGNED,
    });
  }

  /**
   * Send notification to task creator when assignee reacts to task
   */
  async sendTaskReactionNotification(
    params: ITaskReactionNotificationParams,
  ): Promise<void> {
    const {
      taskId,
      creatorUid,
      assigneeUid,
      assigneeName,
      taskTitle,
      reaction,
    } = params;

    const reactionText = reaction.replace(/_/g, ' ');
    await this.sendPushNotification({
      taskId,
      recipientUid: creatorUid,
      senderUid: assigneeUid,
      type: NotificationType.TASK_REACTION,
      title: `${assigneeName} responded`,
      body: `"${reactionText}" on: ${taskTitle}`,
      dataType: NotificationType.TASK_REACTION,
    });
  }

  // ==========================================
  // NOTIFICATION QUERIES
  // ==========================================

  /**
   * Get notifications for a specific user with pagination
   */
  async getUserNotifications(
    uid: string,
    options: IGetNotificationsOptions = {},
  ): Promise<IPaginatedNotificationsResponse> {
    const {
      limit = ALERT_PAGINATION_DEFAULTS.DEFAULT_LIMIT,
      unreadOnly = false,
      type,
      cursor,
    } = options;

    // Build base query
    let query = this.firestore
      .collection(ALERT_COLLECTIONS.NOTIFICATIONS)
      .where('recipientUid', '==', uid);

    if (unreadOnly) {
      query = query.where('isRead', '==', false);
    }

    if (type) {
      query = query.where('type', '==', type);
    }

    // Get total count for pagination metadata
    const totalSnapshot = await query.count().get();
    const total = totalSnapshot.data().count;

    // Apply ordering and pagination
    query = query.orderBy('createdAt', 'desc');

    // If cursor is provided, start after that document
    if (cursor) {
      const cursorDoc = await this.firestore
        .collection(ALERT_COLLECTIONS.NOTIFICATIONS)
        .doc(cursor)
        .get();

      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    // Fetch one extra to determine if there are more results
    const snapshot = await query.limit(limit + 1).get();
    const hasMore = snapshot.docs.length > limit;

    // Remove the extra document if present
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;
    const notifications = docs.map((doc) => this.mapDocumentToResponse(doc));

    // Get the last document ID for next cursor
    const nextCursor =
      hasMore && docs.length > 0 ? docs[docs.length - 1].id : null;

    return {
      notifications,
      pagination: {
        total,
        count: notifications.length,
        limit,
        hasMore,
        nextCursor,
      },
    };
  }

  /**
   * Get a single notification by ID
   */
  async getNotificationById(
    notificationId: string,
  ): Promise<INotificationResponse | null> {
    const doc = await this.firestore
      .collection(ALERT_COLLECTIONS.NOTIFICATIONS)
      .doc(notificationId)
      .get();

    if (!doc.exists) {
      return null;
    }

    return this.mapDocumentToResponse(doc);
  }

  /**
   * Get count of unread notifications for a user
   */
  async getUnreadCount(uid: string): Promise<number> {
    const snapshot = await this.firestore
      .collection(ALERT_COLLECTIONS.NOTIFICATIONS)
      .where('recipientUid', '==', uid)
      .where('isRead', '==', false)
      .count()
      .get();

    return snapshot.data().count;
  }

  // ==========================================
  // NOTIFICATION MUTATIONS
  // ==========================================

  /**
   * Mark a single notification as read
   */
  async markNotificationAsRead(
    notificationId: string,
  ): Promise<IMarkReadResponse> {
    const notificationRef = this.firestore
      .collection(ALERT_COLLECTIONS.NOTIFICATIONS)
      .doc(notificationId);

    const doc = await notificationRef.get();

    if (!doc.exists) {
      throw new Error('Notification not found');
    }

    await notificationRef.update({
      isRead: true,
      readAt: admin.firestore.Timestamp.now(),
      status: NotificationStatus.READ,
    });

    return { message: 'Notification marked as read' };
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(uid: string): Promise<IMarkReadResponse> {
    const snapshot = await this.firestore
      .collection(ALERT_COLLECTIONS.NOTIFICATIONS)
      .where('recipientUid', '==', uid)
      .where('isRead', '==', false)
      .get();

    if (snapshot.empty) {
      return { message: 'No unread notifications' };
    }

    const batch = this.firestore.batch();
    const now = admin.firestore.Timestamp.now();

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        isRead: true,
        readAt: now,
        status: NotificationStatus.READ,
      });
    });

    await batch.commit();

    return { message: `Marked ${snapshot.size} notifications as read` };
  }

  /**
   * Delete a single notification
   */
  async deleteNotification(
    notificationId: string,
    uid: string,
  ): Promise<IMarkReadResponse> {
    const notificationRef = this.firestore
      .collection(ALERT_COLLECTIONS.NOTIFICATIONS)
      .doc(notificationId);

    const doc = await notificationRef.get();

    if (!doc.exists) {
      throw new Error('Notification not found');
    }

    const data = doc.data() as INotificationDocument;
    if (data.recipientUid !== uid) {
      throw new Error('Unauthorized');
    }

    await notificationRef.delete();

    return { message: 'Notification deleted' };
  }

  // ==========================================
  // MAINTENANCE OPERATIONS
  // ==========================================

  /**
   * Delete old notifications (cleanup job)
   */
  async deleteOldNotifications(
    days: number = ALERT_RETENTION.RETENTION_DAYS,
  ): Promise<ICleanupResponse> {
    const cutoff = admin.firestore.Timestamp.fromMillis(
      Date.now() - days * 24 * 60 * 60 * 1000,
    );

    const snapshot = await this.firestore
      .collection(ALERT_COLLECTIONS.NOTIFICATIONS)
      .where('createdAt', '<', cutoff)
      .get();

    if (snapshot.empty) {
      return { deletedCount: 0 };
    }

    // Batch delete in chunks of 500 (Firestore limit)
    const batchSize = 500;
    let deletedCount = 0;

    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = this.firestore.batch();
      const chunk = snapshot.docs.slice(i, i + batchSize);

      chunk.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      deletedCount += chunk.length;
    }

    this.logger.log(`🧹 Deleted ${deletedCount} old notifications`);

    return { deletedCount };
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  /**
   * Core push notification sender with Expo SDK
   */
  private async sendPushNotification(
    params: ISendPushNotificationParams,
  ): Promise<void> {
    const { taskId, recipientUid, senderUid, type, title, body, dataType } =
      params;

    this.logger.log(
      `🔔 Sending notification for task ${taskId} → ${recipientUid}`,
    );

    try {
      // Idempotency check for task assignment (prevent duplicate notifications)
      if (type === NotificationType.TASK_ASSIGNED) {
        const existing = await this.checkExistingNotification(
          taskId,
          recipientUid,
          type,
        );
        if (existing) {
          this.logger.warn(
            `⚠️ Notification already exists for task ${taskId} → ${recipientUid}`,
          );
          return;
        }
      }

      // Create notification record
      const notificationRef = await this.createNotificationRecord({
        type,
        recipientUid,
        senderUid,
        taskId,
        title,
        body,
        dataType,
      });

      // Fetch recipient's push token
      const user = await this.getUser(recipientUid);
      if (!user) {
        await this.updateNotificationStatus(
          notificationRef,
          NotificationStatus.FAILED,
          'User not found',
        );
        return;
      }

      const expoPushToken = user.fcmToken;
      if (!expoPushToken) {
        const userIdentifier = user.name || user.email || recipientUid;
        this.logger.warn(
          `⚠️ User "${userIdentifier}" (${recipientUid}) has no FCM token. User needs to logout/login to register device for push notifications.`,
        );
        await this.updateNotificationStatus(
          notificationRef,
          NotificationStatus.FAILED,
          'User has no FCM token - needs to login to enable notifications',
        );
        return;
      }

      const userIdentifier = user.name || user.email || recipientUid;
      this.logger.log(
        `✓ Found FCM token for "${userIdentifier}" (${recipientUid}): ${expoPushToken.substring(0, 20)}...`,
      );

      // Validate token format
      if (!Expo.isExpoPushToken(expoPushToken)) {
        await this.updateNotificationStatus(
          notificationRef,
          NotificationStatus.FAILED,
          'Invalid Expo Push Token format',
        );
        return;
      }

      // Send push notification via Expo
      await this.sendExpoNotification(notificationRef, expoPushToken, {
        taskId,
        title,
        body,
        dataType,
      });
    } catch (error) {
      this.logger.error('❌ sendPushNotification failed:', error);
      throw error;
    }
  }

  /**
   * Check if a notification already exists (for idempotency)
   */
  private async checkExistingNotification(
    taskId: string,
    recipientUid: string,
    type: NotificationType,
  ): Promise<boolean> {
    const existing = await this.firestore
      .collection(ALERT_COLLECTIONS.NOTIFICATIONS)
      .where('taskId', '==', taskId)
      .where('recipientUid', '==', recipientUid)
      .where('type', '==', type)
      .limit(1)
      .get();

    return !existing.empty;
  }

  /**
   * Create a notification document in Firestore
   */
  private async createNotificationRecord(params: {
    type: NotificationType;
    recipientUid: string;
    senderUid: string;
    taskId: string;
    title: string;
    body: string;
    dataType: string;
  }): Promise<admin.firestore.DocumentReference> {
    const { type, recipientUid, senderUid, taskId, title, body, dataType } =
      params;

    const notificationData: Omit<INotificationDocument, 'id'> = {
      type,
      recipientUid,
      senderUid,
      taskId,
      title,
      body,
      data: {
        taskId,
        type: dataType,
      },
      status: NotificationStatus.PENDING,
      isRead: false,
      createdAt: admin.firestore.Timestamp.now(),
      sentAt: null,
      readAt: null,
    };

    const ref = await this.firestore
      .collection(ALERT_COLLECTIONS.NOTIFICATIONS)
      .add(notificationData);

    this.logger.log(`📝 Notification document created: ${ref.id}`);

    return ref;
  }

  /**
   * Get a user by UID
   */
  private async getUser(uid: string): Promise<FirebaseUser | null> {
    const userSnap = await this.firestore.collection('users').doc(uid).get();

    if (!userSnap.exists) {
      this.logger.error(`❌ User ${uid} not found in Firestore`);
      return null;
    }

    return userSnap.data() as FirebaseUser;
  }

  /**
   * Update notification status with optional error
   */
  private async updateNotificationStatus(
    ref: admin.firestore.DocumentReference,
    status: NotificationStatus,
    error?: string,
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status };

    if (error) {
      updateData.error = error;
      this.logger.error(`❌ ${error}`);
    }

    await ref.update(updateData);
  }

  /**
   * Send notification via Expo Push API
   */
  private async sendExpoNotification(
    notificationRef: admin.firestore.DocumentReference,
    expoPushToken: string,
    params: {
      taskId: string;
      title: string;
      body: string;
      dataType: string;
    },
  ): Promise<void> {
    const { taskId, title, body, dataType } = params;

    const message: ExpoPushMessage = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data: {
        notificationId: notificationRef.id,
        taskId,
        type: dataType,
      },
      priority: 'high',
      channelId: ALERT_PUSH_CONFIG.CHANNEL_ID,
    };

    this.logger.log(`📤 Sending push notification...`);

    const chunks = this.expo.chunkPushNotifications([message]);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    const ticket = tickets[0];

    if (ticket?.status === 'error') {
      const errorMsg = ticket.message || 'Unknown Expo error';
      await this.updateNotificationStatus(
        notificationRef,
        NotificationStatus.FAILED,
        errorMsg,
      );
      throw new Error(errorMsg);
    }

    await notificationRef.update({
      status: NotificationStatus.SENT,
      sentAt: admin.firestore.Timestamp.now(),
      fcmMessageId: ticket?.id || 'unknown',
    });

    this.logger.log(`✅ Notification ${notificationRef.id} sent successfully`);
  }

  /**
   * Map Firestore document to response format
   */
  private mapDocumentToResponse(
    doc:
      | admin.firestore.QueryDocumentSnapshot
      | admin.firestore.DocumentSnapshot,
  ): INotificationResponse {
    const data = doc.data() as Omit<INotificationDocument, 'id'>;

    return {
      id: doc.id,
      type: data.type,
      recipientUid: data.recipientUid,
      senderUid: data.senderUid,
      taskId: data.taskId,
      title: data.title,
      body: data.body,
      data: data.data,
      status: data.status,
      isRead: data.isRead,
      createdAt: data.createdAt?.toDate() || new Date(),
      sentAt: data.sentAt?.toDate() || null,
      readAt: data.readAt?.toDate() || null,
    };
  }
}
