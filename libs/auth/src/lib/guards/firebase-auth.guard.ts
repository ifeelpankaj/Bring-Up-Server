import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as admin from 'firebase-admin';

import {
  AUTH_ERROR_CODES,
  AUTH_HEADER,
  FIREBASE_AUTH_ERRORS,
  IS_PUBLIC_KEY,
  type RequestUser,
} from '@bringup/shared';

/**
 * Firebase Authentication Guard
 * Validates Firebase ID tokens and attaches user to request
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException({
        message: 'Authentication required',
        code: AUTH_ERROR_CODES.AUTH_REQUIRED,
      });
    }

    try {
      // Verify token with checkRevoked = true for security
      const decodedToken = await admin.auth().verifyIdToken(token, true);
      request.user = this.mapTokenToUser(decodedToken);
      return true;
    } catch (error) {
      this.handleFirebaseError(error);
    }
  }

  /**
   * Extract Bearer token from Authorization header
   */
  private extractTokenFromHeader(request: {
    headers: { authorization?: string };
  }): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    if (type?.toLowerCase() === AUTH_HEADER.SCHEME && token) {
      return token;
    }

    return null;
  }

  /**
   * Map decoded Firebase token to RequestUser
   */
  private mapTokenToUser(
    decodedToken: admin.auth.DecodedIdToken,
  ): RequestUser {
    const email = decodedToken.email ?? '';
    const name = (decodedToken['name'] as string) ?? '';

    return {
      uid: decodedToken.uid,
      email,
      emailLower: email.toLowerCase(),
      emailTokens: this.generateEmailTokens(email),
      emailVerified: decodedToken.email_verified ?? false,
      name,
      nameLower: name.toLowerCase(),
      nameTokens: this.generateNameTokens(name),
      photo: decodedToken.picture ?? '',
      lastLoginAt: decodedToken.auth_time
        ? new Date(decodedToken.auth_time * 1000)
        : null,
      isActive: true,
    };
  }

  /**
   * Generate name tokens for search
   */
  private generateNameTokens(name: string): string[] {
    if (!name) return [];
    return name
      .toLowerCase()
      .split(/[\s@._-]+/)
      .filter(Boolean);
  }

  /**
   * Generate email tokens for search
   */
  private generateEmailTokens(email: string): string[] {
    if (!email) return [];
    return email
      .toLowerCase()
      .split(/[\s@._-]+/)
      .filter(Boolean);
  }

  /**
   * Handle Firebase authentication errors
   */
  private handleFirebaseError(error: unknown): never {
    const firebaseError = error as { code?: string };

    this.logger.warn(
      `Firebase auth error: ${firebaseError.code || 'unknown'}`,
    );

    switch (firebaseError.code) {
      case FIREBASE_AUTH_ERRORS.TOKEN_EXPIRED:
        throw new UnauthorizedException({
          message: 'Token has expired',
          code: AUTH_ERROR_CODES.TOKEN_EXPIRED,
        });

      case FIREBASE_AUTH_ERRORS.TOKEN_REVOKED:
        throw new UnauthorizedException({
          message: 'Token has been revoked',
          code: AUTH_ERROR_CODES.TOKEN_REVOKED,
        });

      case FIREBASE_AUTH_ERRORS.ARGUMENT_ERROR:
      case FIREBASE_AUTH_ERRORS.INVALID_TOKEN:
        throw new UnauthorizedException({
          message: 'Invalid token',
          code: AUTH_ERROR_CODES.INVALID_TOKEN,
        });

      case FIREBASE_AUTH_ERRORS.USER_DISABLED:
        throw new UnauthorizedException({
          message: 'User account disabled',
          code: AUTH_ERROR_CODES.USER_DISABLED,
        });

      case FIREBASE_AUTH_ERRORS.USER_NOT_FOUND:
        throw new UnauthorizedException({
          message: 'User not found',
          code: AUTH_ERROR_CODES.USER_NOT_FOUND,
        });

      default:
        throw new UnauthorizedException({
          message: 'Authentication failed',
          code: AUTH_ERROR_CODES.VERIFICATION_FAILED,
        });
    }
  }
}
