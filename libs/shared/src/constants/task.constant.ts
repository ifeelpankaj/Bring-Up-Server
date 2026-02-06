/**
 * Task Constants
 * Centralized task-related constants for the application
 */

// ==========================================
// COLLECTION NAMES
// ==========================================

/**
 * Firestore collection names for tasks
 */
export const TASK_COLLECTIONS = {
  /** Main tasks collection */
  TASKS: 'tasks',
  /** Users collection (for task user lookup) */
  USERS: 'users',
} as const;

// ==========================================
// PAGINATION DEFAULTS
// ==========================================

/**
 * Default pagination values
 */
export const TASK_PAGINATION_DEFAULTS = {
  /** Default page number */
  DEFAULT_PAGE: 1,
  /** Default items per page */
  DEFAULT_LIMIT: 20,
  /** Minimum items per page */
  MIN_LIMIT: 1,
  /** Maximum items per page */
  MAX_LIMIT: 100,
} as const;

// ==========================================
// TIME CONSTANTS
// ==========================================

/**
 * Task time-related constants (in milliseconds)
 */
export const TASK_TIME_MS = {
  /** Milliseconds in a minute */
  MINUTE: 60 * 1000,
  /** Milliseconds in an hour */
  HOUR: 60 * 60 * 1000,
  /** Milliseconds in a day */
  DAY: 24 * 60 * 60 * 1000,
  /** Default TTL after expiration (7 days) */
  DEFAULT_TTL_AFTER_EXPIRY: 7 * 24 * 60 * 60 * 1000,
  /** Time extension for running late reaction (30 minutes) */
  RUNNING_LATE_EXTENSION: 30 * 60 * 1000,
} as const;

/**
 * Task time-related constants (in minutes)
 */
export const TASK_TIME_MINUTES = {
  /** Minimum task duration */
  MIN_DURATION: 5,
  /** Maximum task duration */
  MAX_DURATION: 1440, // 24 hours
  /** Default task duration */
  DEFAULT_DURATION: 30,
  /** Time extension for running late (30 minutes) */
  RUNNING_LATE_EXTENSION: 30,
  /** Maximum number of extensions allowed */
  MAX_EXTENSIONS: 3,
} as const;

// ==========================================
// VALIDATION CONSTANTS
// ==========================================

/**
 * Task validation constants
 */
export const TASK_VALIDATION = {
  /** Minimum title length */
  TITLE_MIN_LENGTH: 3,
  /** Maximum title length */
  TITLE_MAX_LENGTH: 200,
  /** Minimum note length */
  NOTE_MIN_LENGTH: 0,
  /** Maximum note length */
  NOTE_MAX_LENGTH: 1000,
} as const;

// ==========================================
// ERROR CODES
// ==========================================

/**
 * Task-related error codes
 */
export const TASK_ERROR_CODES = {
  /** Task not found */
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  /** Creator user not found */
  CREATOR_NOT_FOUND: 'CREATOR_NOT_FOUND',
  /** Assignee user not found */
  ASSIGNEE_NOT_FOUND: 'ASSIGNEE_NOT_FOUND',
  /** Cannot assign task to yourself */
  SELF_ASSIGNMENT: 'SELF_ASSIGNMENT',
  /** Access denied to task */
  ACCESS_DENIED: 'ACCESS_DENIED',
  /** Only creator can perform action */
  CREATOR_ONLY: 'CREATOR_ONLY',
  /** Only assignee can perform action */
  ASSIGNEE_ONLY: 'ASSIGNEE_ONLY',
  /** Task is expired */
  TASK_EXPIRED: 'TASK_EXPIRED',
  /** Task is completed */
  TASK_COMPLETED: 'TASK_COMPLETED',
  /** Task is cancelled */
  TASK_CANCELLED: 'TASK_CANCELLED',
  /** Invalid status transition */
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  /** Invalid reaction */
  INVALID_REACTION: 'INVALID_REACTION',
  /** Maximum extensions reached */
  MAX_EXTENSIONS_REACHED: 'MAX_EXTENSIONS_REACHED',
  /** Invalid pagination parameters */
  INVALID_PAGINATION: 'INVALID_PAGINATION',
  /** Invalid query type */
  INVALID_QUERY_TYPE: 'INVALID_QUERY_TYPE',
  /** Notification failed */
  NOTIFICATION_FAILED: 'NOTIFICATION_FAILED',
} as const;

export type TaskErrorCode = (typeof TASK_ERROR_CODES)[keyof typeof TASK_ERROR_CODES];

// ==========================================
// SUCCESS MESSAGES
// ==========================================

/**
 * Task-related success messages
 */
export const TASK_SUCCESS_MESSAGES = {
  /** Task created successfully */
  TASK_CREATED: 'Task created and assigned successfully',
  /** Task updated successfully */
  TASK_UPDATED: 'Task updated successfully',
  /** Task status updated */
  STATUS_UPDATED: 'Task status updated successfully',
  /** Task reaction updated */
  REACTION_UPDATED: 'Reaction updated successfully',
  /** Task completed */
  TASK_COMPLETED: 'Task marked as completed',
  /** Task cancelled */
  TASK_CANCELLED: 'Task cancelled successfully',
  /** Task deleted */
  TASK_DELETED: 'Task deleted successfully',
  /** Tasks retrieved */
  TASKS_RETRIEVED: 'Tasks retrieved successfully',
  /** Time extended */
  TIME_EXTENDED: 'Task time extended by 30 minutes',
} as const;

// ==========================================
// ERROR MESSAGES
// ==========================================

/**
 * Task-related error messages
 */
export const TASK_ERROR_MESSAGES = {
  /** Task not found */
  TASK_NOT_FOUND: 'Task not found',
  /** Creator not found */
  CREATOR_NOT_FOUND: 'Creator user not found',
  /** Assignee not found */
  ASSIGNEE_NOT_FOUND: (email: string) => `User with email ${email} not found`,
  /** Self assignment error */
  SELF_ASSIGNMENT: 'Cannot assign task to yourself',
  /** Access denied */
  ACCESS_DENIED: 'You do not have access to this task',
  /** Creator only */
  CREATOR_ONLY: 'Only task creator can perform this action',
  /** Assignee only */
  ASSIGNEE_ONLY: 'Only task assignee can perform this action',
  /** Cannot update expired */
  CANNOT_UPDATE_EXPIRED: 'Cannot update an expired task',
  /** Already completed */
  ALREADY_COMPLETED: 'Task is already completed',
  /** Already cancelled */
  ALREADY_CANCELLED: 'Task is already cancelled',
  /** Cannot react */
  CANNOT_REACT: 'Cannot react to non-pending tasks',
  /** Max extensions */
  MAX_EXTENSIONS: 'Maximum number of extensions reached',
  /** Invalid query type */
  INVALID_QUERY_TYPE: 'Invalid type. Use "created" or "assigned"',
  /** Only assignee can set reaction */
  ONLY_ASSIGNEE_CAN_REACT: 'Only assignee can set reaction',
  /** Only creator can cancel */
  ONLY_CREATOR_CAN_CANCEL: 'Only task creator can cancel the task',
  /** Only assignee can complete */
  ONLY_ASSIGNEE_CAN_COMPLETE: 'Only assignee can mark task as completed',
  /** Only creator can delete */
  ONLY_CREATOR_CAN_DELETE: 'Only task creator can delete the task',
} as const;

// ==========================================
// QUERY DEFAULTS
// ==========================================

/**
 * Default query options
 */
export const TASK_QUERY_DEFAULTS = {
  /** Default sort field */
  DEFAULT_SORT_FIELD: 'createdAt',
  /** Default sort order */
  DEFAULT_SORT_ORDER: 'desc',
} as const;
