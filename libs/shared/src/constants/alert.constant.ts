/**
 * Alert/Notification Constants
 * Centralized notification-related constants for the application
 */

// ==========================================
// COLLECTION NAMES
// ==========================================

/**
 * Firestore collection names for notifications
 */
export const ALERT_COLLECTIONS = {
  /** Notifications collection */
  NOTIFICATIONS: 'notifications',
} as const;

/**
 * @deprecated Use ALERT_COLLECTIONS.NOTIFICATIONS instead
 */
export const NOTIFICATIONS_COLLECTION = 'notifications';

// ==========================================
// PAGINATION DEFAULTS
// ==========================================

/**
 * Default notification query limits
 */
export const ALERT_PAGINATION_DEFAULTS = {
  /** Default notification limit for queries */
  DEFAULT_LIMIT: 50,
  /** Minimum limit */
  MIN_LIMIT: 1,
  /** Maximum limit */
  MAX_LIMIT: 100,
} as const;

/**
 * @deprecated Use ALERT_PAGINATION_DEFAULTS.DEFAULT_LIMIT instead
 */
export const DEFAULT_NOTIFICATION_LIMIT = 50;

// ==========================================
// RETENTION SETTINGS
// ==========================================

/**
 * Notification retention settings
 */
export const ALERT_RETENTION = {
  /** Days to keep notifications before cleanup */
  RETENTION_DAYS: 30,
} as const;

/**
 * @deprecated Use ALERT_RETENTION.RETENTION_DAYS instead
 */
export const NOTIFICATION_RETENTION_DAYS = 30;

// ==========================================
// PUSH NOTIFICATION SETTINGS
// ==========================================

/**
 * Push notification configuration
 */
export const ALERT_PUSH_CONFIG = {
  /** Expo push notification channel ID */
  CHANNEL_ID: 'task_notifications',
  /** Default sound */
  SOUND: 'default',
} as const;

/**
 * @deprecated Use ALERT_PUSH_CONFIG.CHANNEL_ID instead
 */
export const NOTIFICATION_CHANNEL_ID = 'task_notifications';

// ==========================================
// ERROR CODES
// ==========================================

/**
 * Notification-related error codes
 */
export const ALERT_ERROR_CODES = {
  /** Notification not found */
  NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND',
  /** User not found */
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  /** FCM token not available */
  FCM_TOKEN_MISSING: 'FCM_TOKEN_MISSING',
  /** Push notification failed */
  PUSH_FAILED: 'PUSH_FAILED',
  /** Invalid notification type */
  INVALID_TYPE: 'INVALID_TYPE',
  /** Access denied */
  ACCESS_DENIED: 'ACCESS_DENIED',
} as const;

export type AlertErrorCode = (typeof ALERT_ERROR_CODES)[keyof typeof ALERT_ERROR_CODES];

// ==========================================
// SUCCESS MESSAGES
// ==========================================

/**
 * Notification-related success messages
 */
export const ALERT_SUCCESS_MESSAGES = {
  /** Notification sent */
  NOTIFICATION_SENT: 'Notification sent successfully',
  /** Notifications retrieved */
  NOTIFICATIONS_RETRIEVED: 'Notifications retrieved successfully',
  /** Marked as read */
  MARKED_AS_READ: 'Notification marked as read',
  /** All marked as read */
  ALL_MARKED_AS_READ: 'All notifications marked as read',
  /** Cleanup completed */
  CLEANUP_COMPLETED: 'Old notifications cleaned up',
} as const;

// ==========================================
// ERROR MESSAGES
// ==========================================

/**
 * Notification-related error messages
 */
export const ALERT_ERROR_MESSAGES = {
  /** Notification not found */
  NOTIFICATION_NOT_FOUND: 'Notification not found',
  /** User not found */
  USER_NOT_FOUND: 'User not found',
  /** FCM token missing */
  FCM_TOKEN_MISSING: 'FCM token not available for user',
  /** Push failed */
  PUSH_FAILED: 'Failed to send push notification',
  /** Access denied */
  ACCESS_DENIED: 'You do not have access to this notification',
} as const;
