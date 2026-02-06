import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig, FirestoreConfig } from '@bringup/shared'; //types
@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get appConfig(): AppConfig {
    return {
      port: this.configService.getOrThrow<number>('PORT'),
      allowedOrigin: this.configService.getOrThrow<string[]>('ALLOWED_ORIGINS'),
    };
  }
  get firestoreConfig(): FirestoreConfig {
    return {
      projectId: this.configService.getOrThrow<string>('FIREBASE_PROJECT_ID'),
      clientEmail: this.configService.getOrThrow<string>(
        'FIREBASE_CLIENT_EMAIL',
      ),
      privateKey: this.configService.getOrThrow<string>('FIREBASE_PRIVATE_KEY'),
    };
  }

  get isDevelopment(): boolean {
    return (
      process.env.NODE_ENV === 'development'
    );
  }

}
