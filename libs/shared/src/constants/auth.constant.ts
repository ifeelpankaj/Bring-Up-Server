/**
 * Auth Constants
 * Centralized authentication-related constants for the application
 */

/**
 * Metadata key for marking routes as public (no auth required)
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Application-level authentication error codes
 */
export const AUTH_ERROR_CODES = {
  /** Authentication is required for this resource */
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  /** Token has expired */
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  /** Token has been revoked */
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  /** Token is invalid or malformed */
  INVALID_TOKEN: 'INVALID_TOKEN',
  /** User account has been disabled */
  USER_DISABLED: 'USER_DISABLED',
  /** User not found in the system */
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  /** Token verification failed */
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  /** FCM token update failed */
  FCM_UPDATE_FAILED: 'FCM_UPDATE_FAILED',
  /** Logout failed */
  LOGOUT_FAILED: 'LOGOUT_FAILED',
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

/**
 * Firebase Authentication error codes from Firebase Admin SDK
 */
export const FIREBASE_AUTH_ERRORS = {
  /** Token has expired */
  TOKEN_EXPIRED: 'auth/id-token-expired',
  /** Token has been revoked */
  TOKEN_REVOKED: 'auth/id-token-revoked',
  /** Invalid argument provided */
  ARGUMENT_ERROR: 'auth/argument-error',
  /** Invalid token format or signature */
  INVALID_TOKEN: 'auth/invalid-id-token',
  /** User account is disabled */
  USER_DISABLED: 'auth/user-disabled',
  /** User not found */
  USER_NOT_FOUND: 'auth/user-not-found',
  /** Internal Firebase error */
  INTERNAL_ERROR: 'auth/internal-error',
} as const;

export type FirebaseAuthError = (typeof FIREBASE_AUTH_ERRORS)[keyof typeof FIREBASE_AUTH_ERRORS];

/**
 * Auth-related collection names in Firestore
 */
export const AUTH_COLLECTIONS = {
  USERS: 'users',
} as const;

/**
 * Default values for auth operations
 */
export const AUTH_DEFAULTS = {
  /** Default name for anonymous users */
  DEFAULT_NAME: 'Anonymous',
  /** Default photo URL */
  DEFAULT_PHOTO: '',
  /** Search results limit */
  SEARCH_LIMIT: 10,
} as const;

/**
 * Auth token header configuration
 */
export const AUTH_HEADER = {
  /** Authorization header name */
  HEADER_NAME: 'authorization',
  /** Bearer token scheme */
  SCHEME: 'bearer',
} as const;
