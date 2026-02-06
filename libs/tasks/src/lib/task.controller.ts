import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { CurrentUser } from '@bringup/auth';
import {
  CreateTaskDto,
  GetTasksQueryDto,
  UpdateTaskReactionDto,
  UpdateTaskStatusDto,
  TaskIdParamDto,
  TaskStatus,
  TaskApiResponse,
  TasksApiResponse,
  TaskDeleteResponse,
  TASK_SUCCESS_MESSAGES,
} from '@bringup/shared';

/**
 * Current user interface from auth decorator
 */
interface ICurrentUser {
  uid: string;
}

/**
 * Task Controller
 * Handles all task-related HTTP endpoints with pagination support
 */
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  // ==========================================
  // CREATE OPERATIONS
  // ==========================================

  /**
   * Create a new task
   * POST /tasks
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTask(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<TaskApiResponse> {
    const task = await this.taskService.createTask(createTaskDto, user.uid);
    return {
      task,
      message: TASK_SUCCESS_MESSAGES.TASK_CREATED,
    };
  }

  // ==========================================
  // READ OPERATIONS
  // ==========================================

  /**
   * Get paginated tasks for current user
   * GET /tasks/my-tasks?type=created|assigned&page=1&limit=20
   */
  @Get('my-tasks')
  async getMyTasks(
    @Query() query: GetTasksQueryDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<TasksApiResponse> {
    const { type, page, limit, sortBy, sortOrder, status, reaction } = query;

    const result = await this.taskService.getMyTasks(user.uid, {
      type,
      page,
      limit,
      sortBy,
      sortOrder,
      status,
      reaction,
    });

    return {
      items: result.items,
      meta: result.meta,
      message: TASK_SUCCESS_MESSAGES.TASKS_RETRIEVED,
    };
  }

  /**
   * Get a single task by ID
   * GET /tasks/:id
   */
  @Get(':id')
  async getTask(
    @Param() params: TaskIdParamDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<TaskApiResponse> {
    const task = await this.taskService.getTaskById(params.id, user.uid);
    return {
      task,
    };
  }

  // ==========================================
  // UPDATE OPERATIONS
  // ==========================================

  /**
   * Update task status
   * PATCH /tasks/:id/status
   */
  @Patch(':id/status')
  async updateTaskStatus(
    @Param() params: TaskIdParamDto,
    @Body() updateStatusDto: UpdateTaskStatusDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<TaskApiResponse> {
    const task = await this.taskService.updateTaskStatus(
      params.id,
      updateStatusDto.status,
      user.uid,
    );
    return {
      task,
      message: TASK_SUCCESS_MESSAGES.STATUS_UPDATED,
    };
  }

  /**
   * Update task reaction (with running late extension)
   * PATCH /tasks/:id/reaction
   */
  @Patch(':id/reaction')
  async updateTaskReaction(
    @Param() params: TaskIdParamDto,
    @Body() updateReactionDto: UpdateTaskReactionDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<TaskApiResponse> {
    const task = await this.taskService.updateTaskReaction(
      params.id,
      updateReactionDto.reaction,
      user.uid,
    );

    // Include time extension message if running late
    const message =
      updateReactionDto.reaction === 'running_late'
        ? TASK_SUCCESS_MESSAGES.TIME_EXTENDED
        : TASK_SUCCESS_MESSAGES.REACTION_UPDATED;

    return {
      task,
      message,
    };
  }

  /**
   * Mark task as completed (shortcut)
   * PATCH /tasks/:id/complete
   */
  @Patch(':id/complete')
  async completeTask(
    @Param() params: TaskIdParamDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<TaskApiResponse> {
    const task = await this.taskService.updateTaskStatus(
      params.id,
      TaskStatus.COMPLETED,
      user.uid,
    );
    return {
      task,
      message: TASK_SUCCESS_MESSAGES.TASK_COMPLETED,
    };
  }

  /**
   * Cancel task (shortcut)
   * PATCH /tasks/:id/cancel
   */
  @Patch(':id/cancel')
  async cancelTask(
    @Param() params: TaskIdParamDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<TaskApiResponse> {
    const task = await this.taskService.updateTaskStatus(
      params.id,
      TaskStatus.CANCELLED,
      user.uid,
    );
    return {
      task,
      message: TASK_SUCCESS_MESSAGES.TASK_CANCELLED,
    };
  }

  // ==========================================
  // DELETE OPERATIONS
  // ==========================================

  /**
   * Delete a task
   * DELETE /tasks/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteTask(
    @Param() params: TaskIdParamDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<TaskDeleteResponse> {
    await this.taskService.deleteTask(params.id, user.uid);
    return {
      message: TASK_SUCCESS_MESSAGES.TASK_DELETED,
    };
  }
}
