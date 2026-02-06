import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Auth DTOs
 * Data Transfer Objects for authentication-related API requests
 */

/**
 * Login request DTO
 */
export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Firebase token is required' })
  firebaseToken!: string;

  @IsString()
  @IsOptional()
  fcmToken?: string;
}

/**
 * Refresh token request body
 */
export interface RefreshTokenBody {
  fcmToken?: string;
}
