import { Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { AlertModule } from '@bringup/alert';
import { DatabaseModule } from '@bringup/database';

/**
 * Tasks Module
 * Provides task management functionality including:
 * - Task CRUD operations
 * - Pagination support
 * - Running late time extensions
 * - Status and reaction management
 */
@Module({
  imports: [DatabaseModule, AlertModule],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TasksModule {}

