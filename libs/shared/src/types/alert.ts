import * as admin from 'firebase-admin';

// ==========================================
// ALERT ENUMS
// ==========================================

/**
 * Types of notifications in the system
 */
export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_REACTION = 'task_reaction',
  TASK_COMPLETED = 'task_completed',
  TASK_REMINDER = 'task_reminder',
  TASK_UPDATED = 'task_updated',
  TASK_DELETED = 'task_deleted',
  SYSTEM_ALERT = 'system_alert',
}

/**
 * Status of a notification
 */
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

/**
 * Priority levels for notifications
 */
export enum NotificationPriority {
  LOW = 'low',
  DEFAULT = 'default',
  HIGH = 'high',
}

// ==========================================
// ALERT INTERFACES
// ==========================================

/**
 * Notification data payload
 */
export interface INotificationData {
  /** Related task ID */
  taskId: string;
  /** Type of action that triggered the notification */
  type: string;
  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Notification document stored in Firestore
 */
export interface INotificationDocument {
  /** Unique notification ID (Firestore document ID) */
  id: string;
  /** Type of notification */
  type: NotificationType;
  /** User ID of the notification recipient */
  recipientUid: string;
  /** User ID of the notification sender */
  senderUid: string;
  /** Related task ID */
  taskId: string;
  /** Notification title */
  title: string;
  /** Notification body/message */
  body: string;
  /** Additional notification data */
  data: INotificationData;
  /** Current status of the notification */
  status: NotificationStatus;
  /** Whether the notification has been read */
  isRead: boolean;
  /** When the notification was created */
  createdAt: admin.firestore.Timestamp;
  /** When the notification was sent (null if not sent) */
  sentAt: admin.firestore.Timestamp | null;
  /** When the notification was read (null if unread) */
  readAt: admin.firestore.Timestamp | null;
  /** FCM/Expo message ID for tracking */
  fcmMessageId?: string;
  /** Error message if notification failed */
  error?: string;
}

/**
 * Response format for notification list
 */
export interface INotificationResponse {
  id: string;
  type: NotificationType;
  recipientUid: string;
  senderUid: string;
  taskId: string;
  title: string;
  body: string;
  data: INotificationData;
  status: NotificationStatus;
  isRead: boolean;
  createdAt: Date;
  sentAt: Date | null;
  readAt: Date | null;
}

/**
 * Parameters for sending a push notification
 */
export interface ISendPushNotificationParams {
  /** Related task ID */
  taskId: string;
  /** User ID of the recipient */
  recipientUid: string;
  /** User ID of the sender */
  senderUid: string;
  /** Type of notification */
  type: NotificationType;
  /** Notification title */
  title: string;
  /** Notification body */
  body: string;
  /** Data type for the notification payload */
  dataType: string;
}

/**
 * Parameters for task assignment notification
 */
export interface ITaskAssignmentNotificationParams {
  taskId: string;
  assigneeUid: string;
  creatorUid: string;
  creatorName: string;
  taskTitle: string;
}

/**
 * Parameters for task reaction notification
 */
export interface ITaskReactionNotificationParams {
  taskId: string;
  creatorUid: string;
  assigneeUid: string;
  assigneeName: string;
  taskTitle: string;
  reaction: string;
}

/**
 * Query options for fetching notifications
 */
export interface IGetNotificationsOptions {
  /** Maximum number of notifications to fetch */
  limit?: number;
  /** Whether to fetch only unread notifications */
  unreadOnly?: boolean;
  /** Filter by notification type */
  type?: NotificationType;
  /** Pagination cursor (last notification ID) */
  cursor?: string;
}

/**
 * Response for marking notifications as read
 */
export interface IMarkReadResponse {
  message: string;
}

/**
 * Response for notification cleanup operation
 */
export interface ICleanupResponse {
  deletedCount: number;
}

/**
 * Paginated response for notifications
 */
export interface IPaginatedNotificationsResponse {
  /** Array of notifications */
  notifications: INotificationResponse[];
  /** Pagination metadata */
  pagination: {
    /** Total count of notifications matching the query */
    total: number;
    /** Number of items returned in this response */
    count: number;
    /** Maximum items per page */
    limit: number;
    /** Whether there are more items after this page */
    hasMore: boolean;
    /** Cursor for the next page (last notification ID) */
    nextCursor: string | null;
  };
}
