import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';

/**
 * Auth Module
 * Provides authentication functionality with Firebase
 *
 * Features:
 * - Firebase token verification
 * - Global authentication guard
 * - User management (login, logout, profile)
 * - User search functionality
 *
 * @note Requires DatabaseModule to be imported in the parent module
 * for FIRESTORE_TOKEN injection
 */
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    FirebaseAuthGuard,
    {
      provide: APP_GUARD,
      useClass: FirebaseAuthGuard,
    },
  ],
  exports: [AuthService, FirebaseAuthGuard],
})
export class AuthModule {}

