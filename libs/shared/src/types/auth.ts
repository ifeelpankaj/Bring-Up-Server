/**
 * Auth Types
 * Type definitions for authentication-related data structures
 */

/**
 * Firebase User stored in Firestore
 */
export interface FirebaseUser {
  /** Unique user ID from Firebase Auth */
  uid: string;
  /** User's email address */
  email: string;
  /** Whether email is verified */
  emailVerified: boolean;
  /** User's display name */
  name: string;
  /** User's profile photo URL */
  photo: string;
  /** Lowercase email for case-insensitive queries */
  emailLower: string;
  /** Lowercase name for case-insensitive queries */
  nameLower: string;
  /** Tokenized name for search functionality */
  nameTokens: string[];
  /** Tokenized email for search functionality */
  emailTokens: string[];
  /** Account creation timestamp */
  createdAt: Date | null;
  /** Last login timestamp */
  lastLoginAt: Date | null;
  /** Last logout timestamp */
  lastLogoutAt?: Date | null;
  /** Whether user account is active */
  isActive: boolean;
  /** Firebase Cloud Messaging token for push notifications */
  fcmToken: string | null;
  /** When FCM token was last updated */
  fcmTokenUpdatedAt: Date | null;
}

/**
 * Partial Firebase User for request context (from decoded token)
 */
export type RequestUser = Pick<
  FirebaseUser,
  | 'uid'
  | 'email'
  | 'emailVerified'
  | 'name'
  | 'photo'
  | 'emailLower'
  | 'nameLower'
  | 'emailTokens'
  | 'nameTokens'
  | 'isActive'
  | 'lastLoginAt'
>;

/**
 * User data returned in API responses (serialized)
 */
export interface UserResponseData {
  uid: string;
  email: string;
  name: string;
  photo: string;
  emailVerified: boolean;
  createdAt: string | null;
}

/**
 * Login response structure (simplified - no nesting)
 */
export interface LoginResponse {
  user: UserResponseData;
  isNewUser: boolean;
}

/**
 * Logout response structure
 */
export interface LogoutResponse {
  message: string;
}

/**
 * Get user profile response (simplified - no nesting)
 */
export interface UserProfileResponse {
  user: UserResponseData;
}

/**
 * User search response
 */
export interface UserSearchResponse {
  users: UserResponseData[];
  count: number;
  message?: string;
}

/**
 * Refresh token response
 */
export interface RefreshResponse {
  message: string;
}

/**
 * Migration response
 */
export interface MigrationResponse {
  migratedCount: number;
}

/**
 * New user data for creation
 */
export interface NewUserData {
  uid: string;
  email: string;
  name: string;
  photo: string;
  emailVerified: boolean;
  fcmToken: string | null;
}

/**
 * User update data
 */
export interface UserUpdateData {
  name?: string;
  email?: string;
  picture?: string;
  fcmToken?: string;
}

/**
 * Decoded Firebase token user info
 */
export interface DecodedTokenUserInfo {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}
