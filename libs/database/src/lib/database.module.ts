import { Global, Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as admin from 'firebase-admin';

import { FIRESTORE_TOKEN } from '@bringup/shared';
import { AppConfigService } from '@bringup/config';
import { AppLogger } from '@bringup/logger';
import { DatabaseHealthService } from './database-health.service';
import { HealthController } from './database-health.controller';




@Global()
@Module({
  controllers: [HealthController],
  providers: [
    {
      provide: FIRESTORE_TOKEN,
      inject: [AppConfigService, AppLogger],
      useFactory: (config: AppConfigService, logger: AppLogger) => {
        const dbLogger = logger.forContext('Database');
        const { projectId, clientEmail, privateKey } = config.firestoreConfig;

        if (!projectId || !clientEmail || !privateKey) {
          dbLogger.error(
            'Firestore configuration missing',
            new Error('Firestore credentials are missing'),
          );
          throw new Error('Firestore credentials are missing');
        }

        dbLogger.log(`Connecting to Firestore project: "${projectId}"`);

        // Initialize Firebase Admin if not already initialized
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
          });
        }

        const firestore = admin.firestore();

        // Configure Firestore settings
        firestore.settings({
          ignoreUndefinedProperties: true,
        });

        dbLogger.log(`✓ Connected to Firestore project: ${projectId}`);

        return firestore;
      },
    },
    DatabaseHealthService,
  ],
  exports: [FIRESTORE_TOKEN, DatabaseHealthService],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  private readonly dbLogger: AppLogger;

  constructor(private readonly logger: AppLogger) {
    this.dbLogger = this.logger.forContext('FirebaseModule');
  }

  async onModuleInit() {
    this.dbLogger.log('Firestore database module initialized');
  }

  async onModuleDestroy() {
    // Clean up Firebase Admin on module destroy
    if (admin.apps.length) {
      await Promise.all(admin.apps.map((app) => app?.delete()));
      this.dbLogger.log('Firestore connections closed');
    }
  }
}
