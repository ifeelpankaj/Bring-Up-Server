import { Controller, Get } from '@nestjs/common';
import {
  DatabaseHealthService,
} from './database-health.service';
import { HealthStatus } from '@bringup/shared';

@Controller('health')
export class HealthController {
  constructor(private readonly databaseHealthService: DatabaseHealthService) {}

  @Get('database')
  async checkDatabaseHealth(): Promise<HealthStatus> {
    return this.databaseHealthService.checkHealth();
  }
}
