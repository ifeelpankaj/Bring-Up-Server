import {
  applyDecorators,
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { IS_PUBLIC_KEY, type RequestUser } from '@bringup/shared';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';

/**
 * Public route decorator
 * Marks a route as public, skipping FirebaseAuthGuard authentication
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const Public = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Auth decorator
 * Explicitly applies FirebaseAuthGuard to a route or controller
 *
 * @example
 * ```typescript
 * @Auth()
 * @Get('protected')
 * protectedRoute() {
 *   return { message: 'Authenticated!' };
 * }
 * ```
 */
export const Auth = (): ReturnType<typeof applyDecorators> =>
  applyDecorators(UseGuards(FirebaseAuthGuard));

/**
 * Current authenticated user parameter decorator
 * Extracts the authenticated user from the request
 *
 * @param data - Optional key to extract a specific property from the user object
 *
 * @example
 * ```typescript
 * // Get full user object
 * @Get('profile')
 * getProfile(@CurrentUser() user: RequestUser) {
 *   return user;
 * }
 *
 * // Get specific user property
 * @Get('uid')
 * getUid(@CurrentUser('uid') uid: string) {
 *   return { uid };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof RequestUser | undefined,
    ctx: ExecutionContext,
  ): RequestUser | RequestUser[keyof RequestUser] => {
    const request = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();

    const { user } = request;

    if (!user) {
      throw new UnauthorizedException('Login required to access this resource');
    }

    if (typeof user !== 'object' || !user.uid) {
      throw new UnauthorizedException('Invalid user object in request');
    }

    if (data) {
      const value = user[data];

      if (value === undefined || value === null) {
        throw new UnauthorizedException(
          `User property '${String(data)}' not found`,
        );
      }

      return value;
    }

    return user;
  },
);

/**
 * Get user UID from request
 * Shorthand for @CurrentUser('uid')
 */
export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();

    const { user } = request;

    if (!user?.uid) {
      throw new UnauthorizedException('Login required to access this resource');
    }

    return user.uid;
  },
);
