/**
 * Alert/Notification DTOs
 * Data Transfer Objects for notification-related API requests
 */

/**
 * Query parameters for getting user notifications
 */
export interface IGetNotificationsQuery {
  /** Maximum number of notifications to fetch */
  limit?: string;
  /** Whether to fetch only unread notifications */
  unreadOnly?: string;
  /** Pagination cursor (last notification ID) */
  cursor?: string;
}
