import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
} from '@nestjs/common';

import {
  LoginDto,
  type LoginResponse,
  type LogoutResponse,
  type MigrationResponse,
  type RefreshResponse,
  type RefreshTokenBody,
  type RequestUser,
  type UserProfileResponse,
  type UserSearchResponse,
} from '@bringup/shared';

import { AuthService } from './auth.service';
import { CurrentUser, Public } from './decorators/auth.decorators';

/**
 * Authentication Controller
 * Handles user authentication, profile management, and user search
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Login with Google/Firebase authentication
   * Creates new user if not exists, updates existing user on login
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() dto: LoginDto): Promise<LoginResponse> {
    this.logger.log('Login attempt received');
    return this.authService.loginWithGoogle(dto.firebaseToken, dto.fcmToken);
  }

  /**
   * Refresh session - update FCM token if provided
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: RequestUser,
    @Body() body: RefreshTokenBody,
  ): Promise<RefreshResponse> {
    if (body.fcmToken) {
      await this.authService.updateFcmToken(user.uid, body.fcmToken);
    }
    return { message: 'Token refreshed' };
  }

  /**
   * Logout user - revoke tokens and clear FCM token
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: RequestUser): Promise<LogoutResponse> {
    return this.authService.logout(user.uid);
  }

  /**
   * Get current authenticated user's profile
   */
  @Get('me')
  async getCurrentUser(
    @CurrentUser() user: RequestUser,
  ): Promise<UserProfileResponse> {
    return this.authService.getUserProfile(user.uid);
  }

  /**
   * Search users by name or email
   */
  @Get('search')
  async searchUsers(
    @Query('q') searchTerm: string,
  ): Promise<UserSearchResponse> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return {
        users: [],
        count: 0,
        message: 'Search term is required',
      };
    }

    const users = await this.authService.searchUsers(searchTerm);
    return {
      users,
      count: users.length,
    };
  }

  /**
   * Search users by name only
   */
  @Get('search/name')
  async searchUsersByName(
    @Query('q') searchTerm: string,
  ): Promise<UserSearchResponse> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return {
        users: [],
        count: 0,
        message: 'Search term is required',
      };
    }

    const users = await this.authService.searchUsersByName(searchTerm);
    return {
      users,
      count: users.length,
    };
  }

  /**
   * Search users by email only
   */
  @Get('search/email')
  async searchUsersByEmail(
    @Query('q') searchTerm: string,
  ): Promise<UserSearchResponse> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return {
        users: [],
        count: 0,
        message: 'Search term is required',
      };
    }

    const users = await this.authService.searchUsersByEmail(searchTerm);
    return {
      users,
      count: users.length,
    };
  }

  /**
   * Migrate existing users to add search tokens
   * Admin endpoint - should be protected in production
   */
  @Post('migrate-users')
  @HttpCode(HttpStatus.OK)
  async migrateUsers(): Promise<MigrationResponse> {
    this.logger.warn('User migration started');
    return this.authService.migrateExistingUsers();
  }
}
