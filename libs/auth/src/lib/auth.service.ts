import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';

import {
  AUTH_COLLECTIONS,
  AUTH_DEFAULTS,
  AUTH_ERROR_CODES,
  FIRESTORE_TOKEN,
  type DecodedTokenUserInfo,
  type LoginResponse,
  type LogoutResponse,
  type MigrationResponse,
  type NewUserData,
  type UserProfileResponse,
  type UserResponseData,
  type UserUpdateData,
} from '@bringup/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(FIRESTORE_TOKEN)
    private readonly firestore: admin.firestore.Firestore,
  ) {}

  /**
   * Generate search tokens for name field
   * Enables prefix-based search functionality
   */
  private generateNameTokens(name: string): string[] {
    if (!name) return [];

    const tokens = new Set<string>();
    const lower = name.toLowerCase().trim();

    // Generate character-by-character prefixes
    for (let i = 1; i <= lower.length; i++) {
      tokens.add(lower.substring(0, i));
    }

    // Split by spaces and add word tokens
    const words = lower.split(/\s+/).filter((word) => word.length > 0);
    words.forEach((word) => {
      tokens.add(word);
      for (let i = 1; i <= word.length; i++) {
        tokens.add(word.substring(0, i));
      }
    });

    return Array.from(tokens);
  }

  /**
   * Generate search tokens for email field
   * Enables prefix-based search on email username
   */
  private generateEmailTokens(email: string): string[] {
    if (!email) return [];

    const tokens = new Set<string>();
    const lower = email.toLowerCase().trim();

    tokens.add(lower);

    const username = lower.split('@')[0];
    if (username) {
      tokens.add(username);
      for (let i = 1; i <= username.length; i++) {
        tokens.add(username.substring(0, i));
      }
    }

    return Array.from(tokens);
  }

  /**
   * Format Firestore timestamp to ISO string
   */
  private formatTimestamp(
    timestamp: admin.firestore.Timestamp | null | undefined,
  ): string | null {
    if (!timestamp) return null;
    try {
      return timestamp.toDate().toISOString();
    } catch {
      return null;
    }
  }

  /**
   * Login or register user with Google/Firebase authentication
   */
  async loginWithGoogle(
    firebaseToken: string,
    fcmToken?: string,
  ): Promise<LoginResponse> {
    this.logger.log(
      `Login received - FCM Token: ${fcmToken ? '✓ Provided' : '✗ Missing'}`,
    );

    const decodedToken = await this.verifyToken(firebaseToken);
    const { uid, email, name, picture, email_verified } =
      decodedToken as unknown as DecodedTokenUserInfo;

    const userRef = this.firestore.collection(AUTH_COLLECTIONS.USERS).doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return this.createNewUser(userRef, {
        uid,
        email: email || '',
        name: name || AUTH_DEFAULTS.DEFAULT_NAME,
        photo: picture || AUTH_DEFAULTS.DEFAULT_PHOTO,
        emailVerified: email_verified || false,
        fcmToken: fcmToken || null,
      });
    }

    return this.updateExistingUser(userRef, userDoc, {
      name,
      email,
      picture,
      fcmToken,
    });
  }

  /**
   * Update FCM token for push notifications
   */
  async updateFcmToken(
    uid: string,
    fcmToken: string,
  ): Promise<{ success: boolean }> {
    try {
      const userRef = this.firestore
        .collection(AUTH_COLLECTIONS.USERS)
        .doc(uid);
      await userRef.update({
        fcmToken,
        fcmTokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      this.logger.log(`FCM token updated for user: ${uid}`);
      return { success: true };
    } catch (error) {
      this.logger.warn(`Failed to update FCM token for user ${uid}:`, error);
      throw new UnauthorizedException({
        message: 'Failed to update FCM token',
        code: AUTH_ERROR_CODES.FCM_UPDATE_FAILED,
      });
    }
  }

  /**
   * Verify Firebase ID token
   */
  private async verifyToken(
    firebaseToken: string,
  ): Promise<admin.auth.DecodedIdToken> {
    try {
      return await admin.auth().verifyIdToken(firebaseToken);
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error) {
        const firebaseError = error as { code: string };
        if (firebaseError.code === 'auth/id-token-expired') {
          throw new UnauthorizedException({
            message: 'Token expired',
            code: AUTH_ERROR_CODES.TOKEN_EXPIRED,
          });
        }
        if (firebaseError.code === 'auth/argument-error') {
          throw new UnauthorizedException({
            message: 'Invalid token format',
            code: AUTH_ERROR_CODES.INVALID_TOKEN,
          });
        }
      }
      throw new UnauthorizedException({
        message: 'Authentication failed',
        code: AUTH_ERROR_CODES.VERIFICATION_FAILED,
      });
    }
  }

  /**
   * Create a new user in Firestore
   */
  private async createNewUser(
    userRef: admin.firestore.DocumentReference,
    userData: NewUserData,
  ): Promise<LoginResponse> {
    const newUser = {
      ...userData,
      emailLower: userData.email.toLowerCase(),
      nameLower: userData.name.toLowerCase(),
      nameTokens: this.generateNameTokens(userData.name),
      emailTokens: this.generateEmailTokens(userData.email),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      fcmTokenUpdatedAt: userData.fcmToken
        ? admin.firestore.FieldValue.serverTimestamp()
        : null,
      isActive: true,
    };

    await userRef.set(newUser);

    this.logger.log(`New user created: ${userData.uid}`);
    this.logger.log(
      `FCM token stored: ${userData.fcmToken ? '✓ Yes' : '✗ No'}`,
    );

    return {
      user: {
        uid: userData.uid,
        email: userData.email,
        name: userData.name,
        photo: userData.photo,
        emailVerified: userData.emailVerified,
        createdAt: new Date().toISOString(),
      },
      isNewUser: true,
    };
  }

  /**
   * Update existing user on login
   */
  private async updateExistingUser(
    userRef: admin.firestore.DocumentReference,
    userDoc: admin.firestore.DocumentSnapshot,
    updates: UserUpdateData,
  ): Promise<LoginResponse> {
    const existingData = userDoc.data() ?? {};
    const updatedName =
      updates.name ||
      (existingData['name'] as string) ||
      AUTH_DEFAULTS.DEFAULT_NAME;
    const updatedEmail =
      updates.email || (existingData['email'] as string) || '';
    const updatedPhoto =
      updates.picture ||
      (existingData['photo'] as string) ||
      AUTH_DEFAULTS.DEFAULT_PHOTO;

    const updateData: Record<string, unknown> = {
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      name: updatedName,
      photo: updatedPhoto,
      nameLower: updatedName.toLowerCase(),
      emailLower: updatedEmail.toLowerCase(),
      nameTokens: this.generateNameTokens(updatedName),
      emailTokens: this.generateEmailTokens(updatedEmail),
    };

    if (updates.fcmToken !== undefined) {
      updateData['fcmToken'] = updates.fcmToken || null;
      updateData['fcmTokenUpdatedAt'] =
        admin.firestore.FieldValue.serverTimestamp();
    }

    await userRef.update(updateData);

    this.logger.log(`User ${userDoc.id} updated`);
    this.logger.log(
      `FCM token updated: ${updates.fcmToken !== undefined ? (updates.fcmToken ? '✓ Yes' : '✗ Cleared') : '→ Unchanged'}`,
    );

    const createdAt = this.formatTimestamp(
      existingData['createdAt'] as admin.firestore.Timestamp | undefined,
    );

    return {
      user: {
        uid: userDoc.id,
        email: updatedEmail,
        name: updatedName,
        photo: updatedPhoto,
        emailVerified: (existingData['emailVerified'] as boolean) || false,
        createdAt,
      },
      isNewUser: false,
    };
  }

  /**
   * Logout user - revoke tokens and clear FCM token
   */
  async logout(uid: string): Promise<LogoutResponse> {
    try {
      await admin.auth().revokeRefreshTokens(uid);

      await this.firestore.collection(AUTH_COLLECTIONS.USERS).doc(uid).update({
        fcmToken: null,
        lastLogoutAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      this.logger.log(`User logged out: ${uid}`);

      return {
        message: 'Logged out successfully',
      };
    } catch (error) {
      this.logger.error(`Logout failed for user ${uid}:`, error);
      throw new UnauthorizedException({
        message: 'Logout failed',
        code: AUTH_ERROR_CODES.LOGOUT_FAILED,
      });
    }
  }

  /**
   * Get user profile by UID
   */
  async getUserProfile(uid: string): Promise<UserProfileResponse> {
    try {
      const userRef = this.firestore
        .collection(AUTH_COLLECTIONS.USERS)
        .doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new UnauthorizedException({
          message: 'User not found',
          code: AUTH_ERROR_CODES.USER_NOT_FOUND,
        });
      }

      const userData = userDoc.data() ?? {};

      const createdAt = this.formatTimestamp(
        userData['createdAt'] as admin.firestore.Timestamp | undefined,
      );

      return {
        user: {
          uid: userDoc.id,
          email: (userData['email'] as string) || '',
          name: (userData['name'] as string) || AUTH_DEFAULTS.DEFAULT_NAME,
          photo: (userData['photo'] as string) || AUTH_DEFAULTS.DEFAULT_PHOTO,
          emailVerified: (userData['emailVerified'] as boolean) || false,
          createdAt,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Failed to get user profile for ${uid}:`, error);
      throw new UnauthorizedException({
        message: 'Failed to get user profile',
        code: AUTH_ERROR_CODES.VERIFICATION_FAILED,
      });
    }
  }

  /**
   * Search users by name using tokenized search
   */
  async searchUsersByName(searchTerm: string): Promise<UserResponseData[]> {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return [];
      }

      const usersRef = this.firestore.collection(AUTH_COLLECTIONS.USERS);
      const lower = searchTerm.toLowerCase().trim();

      const snapshot = await usersRef
        .where('nameTokens', 'array-contains', lower)
        .where('isActive', '==', true)
        .limit(AUTH_DEFAULTS.SEARCH_LIMIT)
        .get();

      return snapshot.docs.map((doc) => this.mapDocToUserResponse(doc));
    } catch (error) {
      this.logger.error('Failed to search users by name:', error);
      throw new Error('Failed to search users by name');
    }
  }

  /**
   * Search users by email using tokenized search
   */
  async searchUsersByEmail(searchTerm: string): Promise<UserResponseData[]> {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return [];
      }

      const usersRef = this.firestore.collection(AUTH_COLLECTIONS.USERS);
      const lower = searchTerm.toLowerCase().trim();

      const snapshot = await usersRef
        .where('emailTokens', 'array-contains', lower)
        .where('isActive', '==', true)
        .limit(AUTH_DEFAULTS.SEARCH_LIMIT)
        .get();

      return snapshot.docs.map((doc) => this.mapDocToUserResponse(doc));
    } catch (error) {
      this.logger.error('Failed to search users by email:', error);
      throw new Error('Failed to search users by email');
    }
  }

  /**
   * Search users by name or email
   */
  async searchUsers(searchTerm: string): Promise<UserResponseData[]> {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return [];
      }

      const [nameResults, emailResults] = await Promise.all([
        this.searchUsersByName(searchTerm),
        this.searchUsersByEmail(searchTerm),
      ]);

      // Merge and deduplicate results
      const uniqueUsers = new Map<string, UserResponseData>();

      [...nameResults, ...emailResults].forEach((user) => {
        if (!uniqueUsers.has(user.uid)) {
          uniqueUsers.set(user.uid, user);
        }
      });

      return Array.from(uniqueUsers.values());
    } catch (error) {
      this.logger.error('Failed to search users:', error);
      throw new Error('Failed to search users');
    }
  }

  /**
   * Map Firestore document to UserResponseData
   */
  private mapDocToUserResponse(
    doc: admin.firestore.DocumentSnapshot,
  ): UserResponseData {
    const data = doc.data() ?? {};
    return {
      uid: doc.id,
      email: (data['email'] as string) || '',
      name: (data['name'] as string) || AUTH_DEFAULTS.DEFAULT_NAME,
      photo: (data['photo'] as string) || AUTH_DEFAULTS.DEFAULT_PHOTO,
      emailVerified: (data['emailVerified'] as boolean) || false,
      createdAt: this.formatTimestamp(
        data['createdAt'] as admin.firestore.Timestamp | undefined,
      ),
    };
  }

  /**
   * Migrate existing users to add search tokens
   * Should only be run once or for maintenance
   */
  async migrateExistingUsers(): Promise<MigrationResponse> {
    try {
      const usersRef = this.firestore.collection(AUTH_COLLECTIONS.USERS);
      const snapshot = await usersRef.get();

      const batch = this.firestore.batch();
      let count = 0;

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const name = (data['name'] as string) || AUTH_DEFAULTS.DEFAULT_NAME;
        const email = (data['email'] as string) || '';

        batch.update(doc.ref, {
          emailLower: email.toLowerCase(),
          nameLower: name.toLowerCase(),
          nameTokens: this.generateNameTokens(name),
          emailTokens: this.generateEmailTokens(email),
        });

        count++;
      });

      await batch.commit();

      this.logger.log(`Migrated ${count} users`);

      return { migratedCount: count };
    } catch (error) {
      this.logger.error('Failed to migrate existing users:', error);
      throw new Error('Failed to migrate existing users');
    }
  }
}
