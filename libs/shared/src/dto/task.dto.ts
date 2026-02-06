import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  TaskStatus,
  TaskReaction,
  TaskQueryType,
  TaskSortField,
  SortOrder,
} from '../types/task';
import {
  TASK_PAGINATION_DEFAULTS,
  TASK_TIME_MINUTES,
  TASK_VALIDATION,
} from '../constants/task.constant';

// ==========================================
// CREATE TASK DTO
// ==========================================

/**
 * DTO for creating a new task
 */
export class CreateTaskDto {
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(TASK_VALIDATION.TITLE_MIN_LENGTH, {
    message: `Title must be at least ${TASK_VALIDATION.TITLE_MIN_LENGTH} characters`,
  })
  @MaxLength(TASK_VALIDATION.TITLE_MAX_LENGTH, {
    message: `Title cannot exceed ${TASK_VALIDATION.TITLE_MAX_LENGTH} characters`,
  })
  @Transform(({ value }) => value?.trim())
  title!: string;

  @IsString({ message: 'Note must be a string' })
  @IsOptional()
  @MaxLength(TASK_VALIDATION.NOTE_MAX_LENGTH, {
    message: `Note cannot exceed ${TASK_VALIDATION.NOTE_MAX_LENGTH} characters`,
  })
  @Transform(({ value }) => value?.trim() || null)
  note?: string | null;

  @IsInt({ message: 'Duration must be a whole number' })
  @Min(TASK_TIME_MINUTES.MIN_DURATION, {
    message: `Duration must be at least ${TASK_TIME_MINUTES.MIN_DURATION} minutes`,
  })
  @Max(TASK_TIME_MINUTES.MAX_DURATION, {
    message: `Duration cannot exceed ${TASK_TIME_MINUTES.MAX_DURATION} minutes`,
  })
  @Type(() => Number)
  durationMinutes!: number;

  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Assignee email is required' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  assignToEmail!: string;
}

// ==========================================
// UPDATE TASK STATUS DTO
// ==========================================

/**
 * DTO for updating task status
 */
export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus, { message: 'Invalid task status' })
  @IsNotEmpty({ message: 'Status is required' })
  status!: TaskStatus;
}

// ==========================================
// UPDATE TASK REACTION DTO
// ==========================================

/**
 * DTO for updating task reaction
 */
export class UpdateTaskReactionDto {
  @IsEnum(TaskReaction, { message: 'Invalid reaction' })
  @IsNotEmpty({ message: 'Reaction is required' })
  reaction!: TaskReaction;
}

// ==========================================
// PAGINATION QUERY DTO
// ==========================================

/**
 * Base pagination query parameters
 */
export class PaginationQueryDto {
  @IsInt({ message: 'Page must be a whole number' })
  @Min(1, { message: 'Page must be at least 1' })
  @Type(() => Number)
  @IsOptional()
  page: number = TASK_PAGINATION_DEFAULTS.DEFAULT_PAGE;

  @IsInt({ message: 'Limit must be a whole number' })
  @Min(TASK_PAGINATION_DEFAULTS.MIN_LIMIT, {
    message: `Limit must be at least ${TASK_PAGINATION_DEFAULTS.MIN_LIMIT}`,
  })
  @Max(TASK_PAGINATION_DEFAULTS.MAX_LIMIT, {
    message: `Limit cannot exceed ${TASK_PAGINATION_DEFAULTS.MAX_LIMIT}`,
  })
  @Type(() => Number)
  @IsOptional()
  limit: number = TASK_PAGINATION_DEFAULTS.DEFAULT_LIMIT;

  @IsEnum(TaskSortField, { message: 'Invalid sort field' })
  @IsOptional()
  sortBy?: TaskSortField;

  @IsEnum(SortOrder, { message: 'Invalid sort order' })
  @IsOptional()
  sortOrder?: SortOrder;
}

// ==========================================
// GET TASKS QUERY DTO
// ==========================================

/**
 * Query parameters for getting tasks
 */
export class GetTasksQueryDto extends PaginationQueryDto {
  @IsEnum(TaskQueryType, { message: 'Type must be "created" or "assigned"' })
  @IsNotEmpty({ message: 'Type is required' })
  type!: TaskQueryType;

  @IsEnum(TaskStatus, { message: 'Invalid status filter' })
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskReaction, { message: 'Invalid reaction filter' })
  @IsOptional()
  reaction?: TaskReaction;
}

// ==========================================
// TASK ID PARAM DTO
// ==========================================

/**
 * Task ID parameter validation
 */
export class TaskIdParamDto {
  @IsString({ message: 'Task ID must be a string' })
  @IsNotEmpty({ message: 'Task ID is required' })
  id!: string;
}
