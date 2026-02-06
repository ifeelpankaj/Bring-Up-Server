import * as admin from 'firebase-admin';

// ==========================================
// TASK ENUMS
// ==========================================

/**
 * Possible statuses for a task
 */
export enum TaskStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

/**
 * Assignee reactions to a task
 */
export enum TaskReaction {
  ON_IT = 'on_it',
  RUNNING_LATE = 'running_late',
  NEED_HELP = 'need_help',
}

/**
 * Task query type for filtering
 */
export enum TaskQueryType {
  CREATED = 'created',
  ASSIGNED = 'assigned',
}

/**
 * Task sort field options
 */
export enum TaskSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  EXPIRES_AT = 'urgency.expiresAt',
}

/**
 * Sort order direction
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

// ==========================================
// TASK USER INTERFACES
// ==========================================

/**
 * Minimal user info for task assignment
 */
export interface TaskUser {
  /** User's unique ID */
  uid: string;
  /** User's email address */
  email: string;
  /** User's display name */
  name: string;
}

// ==========================================
// TASK URGENCY INTERFACES
// ==========================================

/**
 * Task urgency configuration
 */
export interface TaskUrgency {
  /** When the task expires */
  expiresAt: admin.firestore.Timestamp;
  /** Original duration in minutes */
  durationMinutes: number;
}

/**
 * Serialized task urgency for API responses
 */
export interface TaskUrgencyResponse {
  /** When the task expires (ISO string) */
  expiresAt: string;
  /** Original duration in minutes */
  durationMinutes: number;
  /** Remaining time in minutes (calculated) */
  remainingMinutes: number;
  /** Whether task is expired */
  isExpired: boolean;
}

// ==========================================
// TASK NOTIFICATION INTERFACES
// ==========================================

/**
 * Task notification status
 */
export interface TaskNotification {
  /** Whether notification was sent */
  sent: boolean;
  /** When notification was sent */
  sentAt: admin.firestore.Timestamp | null;
  /** Error message if notification failed */
  error?: string | null;
}

/**
 * Serialized task notification for API responses
 */
export interface TaskNotificationResponse {
  /** Whether notification was sent */
  sent: boolean;
  /** When notification was sent (ISO string) */
  sentAt: string | null;
  /** Error message if notification failed */
  error?: string | null;
}

// ==========================================
// TASK DOCUMENT INTERFACES
// ==========================================

/**
 * Firestore document data for a task (stored format)
 */
export interface TaskDocument {
  /** Task title */
  title: string;
  /** Optional task note/description */
  note: string | null;
  /** User who created the task */
  createdBy: TaskUser;
  /** User assigned to the task */
  assignedTo: TaskUser;
  /** Current task status */
  status: TaskStatus;
  /** Assignee's reaction to the task */
  assigneeReaction: TaskReaction | null;
  /** Urgency configuration */
  urgency: TaskUrgency;
  /** Notification status */
  notification: TaskNotification;
  /** When task was created */
  createdAt: admin.firestore.Timestamp;
  /** When task was last updated */
  updatedAt: admin.firestore.Timestamp;
  /** Time-to-live for automatic cleanup */
  ttl: admin.firestore.Timestamp;
  /** Number of time extensions applied (running late) */
  extensionCount: number;
}

/**
 * Task with ID (retrieved from Firestore)
 */
export interface Task extends TaskDocument {
  /** Unique task ID (Firestore document ID) */
  id: string;
}

// ==========================================
// TASK RESPONSE INTERFACES
// ==========================================

/**
 * Serialized task for API responses
 */
export interface TaskResponse {
  /** Unique task ID */
  id: string;
  /** Task title */
  title: string;
  /** Optional task note/description */
  note: string | null;
  /** User who created the task */
  createdBy: TaskUser;
  /** User assigned to the task */
  assignedTo: TaskUser;
  /** Current task status */
  status: TaskStatus;
  /** Assignee's reaction to the task */
  assigneeReaction: TaskReaction | null;
  /** Urgency information */
  urgency: TaskUrgencyResponse;
  /** Notification status */
  notification: TaskNotificationResponse;
  /** When task was created (ISO string) */
  createdAt: string;
  /** When task was last updated (ISO string) */
  updatedAt: string;
  /** Number of time extensions applied */
  extensionCount: number;
}

// ==========================================
// PAGINATION INTERFACES
// ==========================================

/**
 * Pagination request parameters
 */
export interface PaginationParams {
  /** Page number (1-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Field to sort by */
  sortBy?: TaskSortField;
  /** Sort order */
  sortOrder?: SortOrder;
}

/**
 * Pagination metadata for responses
 */
export interface PaginationMeta {
  /** Current page number */
  currentPage: number;
  /** Number of items per page */
  itemsPerPage: number;
  /** Total number of items */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  /** Array of items */
  items: T[];
  /** Pagination metadata */
  meta: PaginationMeta;
}

// ==========================================
// TASK API RESPONSE INTERFACES
// ==========================================

/**
 * Single task response (simplified - no nesting)
 */
export interface TaskApiResponse {
  task: TaskResponse;
  message?: string;
}

/**
 * Paginated tasks response (simplified - no nesting)
 */
export interface TasksApiResponse {
  items: TaskResponse[];
  meta: PaginationMeta;
  message?: string;
}

/**
 * Task deletion response
 */
export interface TaskDeleteResponse {
  message: string;
}

// ==========================================
// TASK FILTER INTERFACES
// ==========================================

/**
 * Filter options for task queries
 */
export interface TaskFilters {
  /** Filter by task status */
  status?: TaskStatus;
  /** Filter by assignee reaction */
  reaction?: TaskReaction;
  /** Filter tasks created after this date */
  createdAfter?: Date;
  /** Filter tasks created before this date */
  createdBefore?: Date;
  /** Filter tasks expiring after this date */
  expiresAfter?: Date;
  /** Filter tasks expiring before this date */
  expiresBefore?: Date;
}

/**
 * Complete task query options
 */
export interface TaskQueryOptions extends PaginationParams {
  /** Query type (created/assigned) */
  type: TaskQueryType;
  /** Additional filters */
  filters?: TaskFilters;
}

/**
 * Task service options for pagination
 */
export interface GetTasksOptions {
  type: TaskQueryType;
  page: number;
  limit: number;
  sortBy?: TaskSortField;
  sortOrder?: SortOrder;
  status?: TaskStatus;
  reaction?: TaskReaction;
}
