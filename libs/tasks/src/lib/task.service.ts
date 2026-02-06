import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  CreateTaskDto,
  FirebaseUser,
  FIRESTORE_TOKEN,
  Task,
  TaskDocument,
  TaskReaction,
  TaskStatus,
  TaskUser,
  TaskQueryType,
  TaskResponse,
  TaskUrgencyResponse,
  TaskNotificationResponse,
  PaginatedResponse,
  PaginationMeta,
  TaskSortField,
  SortOrder,
  GetTasksOptions,
  TASK_COLLECTIONS,
  TASK_PAGINATION_DEFAULTS,
  TASK_TIME_MS,
  TASK_TIME_MINUTES,
  TASK_ERROR_MESSAGES,
} from '@bringup/shared';
import { AlertService } from '@bringup/alert';


@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @Inject(FIRESTORE_TOKEN)
    private readonly firestore: admin.firestore.Firestore,
    private readonly notyService: AlertService,
  ) {}

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  /**
   * Convert Firestore Timestamp to ISO string
   */
  private toISOString(timestamp: admin.firestore.Timestamp | null): string | null {
    return timestamp ? timestamp.toDate().toISOString() : null;
  }

  /**
   * Calculate remaining minutes until expiry
   */
  private calculateRemainingMinutes(expiresAt: admin.firestore.Timestamp): number {
    const now = Date.now();
    const expiryTime = expiresAt.toMillis();
    const remainingMs = expiryTime - now;
    return Math.max(0, Math.floor(remainingMs / TASK_TIME_MS.MINUTE));
  }

  /**
   * Check if task is expired
   */
  private isExpired(expiresAt: admin.firestore.Timestamp): boolean {
    return expiresAt.toMillis() <= Date.now();
  }

  /**
   * Transform task document to API response format
   */
  private transformToResponse(task: Task): TaskResponse {
    const urgency: TaskUrgencyResponse = {
      expiresAt: this.toISOString(task.urgency.expiresAt) as string,
      durationMinutes: task.urgency.durationMinutes,
      remainingMinutes: this.calculateRemainingMinutes(task.urgency.expiresAt),
      isExpired: this.isExpired(task.urgency.expiresAt),
    };

    const notification: TaskNotificationResponse = {
      sent: task.notification.sent,
      sentAt: this.toISOString(task.notification.sentAt),
      error: task.notification.error,
    };

    return {
      id: task.id,
      title: task.title,
      note: task.note,
      createdBy: task.createdBy,
      assignedTo: task.assignedTo,
      status: task.status,
      assigneeReaction: task.assigneeReaction,
      urgency,
      notification,
      createdAt: this.toISOString(task.createdAt) as string,
      updatedAt: this.toISOString(task.updatedAt) as string,
      extensionCount: task.extensionCount ?? 0,
    };
  }

  /**
   * Build pagination metadata
   */
  private buildPaginationMeta(
    totalItems: number,
    page: number,
    limit: number,
  ): PaginationMeta {
    const totalPages = Math.ceil(totalItems / limit);
    return {
      currentPage: page,
      itemsPerPage: limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Get task user reference
   */
  private async getTaskUser(
    uid: string,
    errorMessage: string,
  ): Promise<TaskUser> {
    const userDoc = await this.firestore
      .collection(TASK_COLLECTIONS.USERS)
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      throw new NotFoundException(errorMessage);
    }

    const userData = userDoc.data() as FirebaseUser;
    return {
      uid,
      email: userData.email ?? '',
      name: userData.name ?? 'Unknown',
    };
  }

  /**
   * Find user by email
   */
  private async findUserByEmail(email: string): Promise<TaskUser & { docId: string }> {
    const snapshot = await this.firestore
      .collection(TASK_COLLECTIONS.USERS)
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException(TASK_ERROR_MESSAGES.ASSIGNEE_NOT_FOUND(email));
    }

    const doc = snapshot.docs[0];
    const data = doc.data() as FirebaseUser;
    return {
      docId: doc.id,
      uid: doc.id,
      email: data.email ?? '',
      name: data.name ?? 'Unknown',
    };
  }

  /**
   * Get task document with authorization check
   */
  private async getAuthorizedTask(
    taskId: string,
    userUid: string,
  ): Promise<{ task: Task; taskRef: admin.firestore.DocumentReference }> {
    const taskRef = this.firestore.collection(TASK_COLLECTIONS.TASKS).doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      throw new NotFoundException(TASK_ERROR_MESSAGES.TASK_NOT_FOUND);
    }

    const taskData = taskDoc.data() as TaskDocument;

    if (
      taskData.createdBy.uid !== userUid &&
      taskData.assignedTo.uid !== userUid
    ) {
      throw new ForbiddenException(TASK_ERROR_MESSAGES.ACCESS_DENIED);
    }

    return {
      task: { id: taskDoc.id, ...taskData } as Task,
      taskRef,
    };
  }

  // ==========================================
  // PUBLIC METHODS
  // ==========================================

  /**
   * Create a new task
   */
  async createTask(
    createTaskDto: CreateTaskDto,
    creatorUid: string,
  ): Promise<TaskResponse> {
    const { title, note, durationMinutes, assignToEmail } = createTaskDto;

    // Get creator details
    const creator = await this.getTaskUser(
      creatorUid,
      TASK_ERROR_MESSAGES.CREATOR_NOT_FOUND,
    );

    // Find assignee
    const assigneeResult = await this.findUserByEmail(assignToEmail);

    // Prevent self-assignment
    if (assigneeResult.docId === creatorUid) {
      throw new BadRequestException(TASK_ERROR_MESSAGES.SELF_ASSIGNMENT);
    }

    const assignee: TaskUser = {
      uid: assigneeResult.uid,
      email: assigneeResult.email,
      name: assigneeResult.name,
    };

    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + durationMinutes * TASK_TIME_MS.MINUTE,
    );

    const taskData: Omit<TaskDocument, 'id'> = {
      title: title.trim(),
      note: note?.trim() ?? null,
      createdBy: creator,
      assignedTo: assignee,
      status: TaskStatus.PENDING,
      assigneeReaction: null,
      urgency: {
        expiresAt,
        durationMinutes,
      },
      notification: {
        sent: false,
        sentAt: null,
      },
      createdAt: now,
      updatedAt: now,
      ttl: admin.firestore.Timestamp.fromMillis(
        expiresAt.toMillis() + TASK_TIME_MS.DEFAULT_TTL_AFTER_EXPIRY,
      ),
      extensionCount: 0,
    };

    const taskRef = await this.firestore
      .collection(TASK_COLLECTIONS.TASKS)
      .add(taskData);

    // Send notification
    let notificationSent = false;
    let notificationSentAt: admin.firestore.Timestamp | null = null;
    let notificationError: string | null = null;

    try {
      await this.notyService.sendTaskAssignmentNotification({
        taskId: taskRef.id,
        assigneeUid: assignee.uid,
        creatorUid: creator.uid,
        creatorName: creator.name,
        taskTitle: title,
      });

      notificationSentAt = admin.firestore.Timestamp.now();
      await taskRef.update({
        'notification.sent': true,
        'notification.sentAt': notificationSentAt,
      });

      notificationSent = true;
      this.logger.log(`Task notification sent for task ${taskRef.id}`);
    } catch (error) {
      this.logger.warn(`Notification failed for task ${taskRef.id}:`, error);
      notificationError = (error as Error).message;
      await taskRef.update({
        'notification.sent': false,
        'notification.error': notificationError,
      });
    }

    const task: Task = {
      id: taskRef.id,
      ...taskData,
      notification: {
        sent: notificationSent,
        sentAt: notificationSentAt,
        error: notificationError,
      },
    };

    return this.transformToResponse(task);
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string, userUid: string): Promise<TaskResponse> {
    const { task, taskRef } = await this.getAuthorizedTask(taskId, userUid);

    // Auto-update expired status
    if (
      task.status === TaskStatus.PENDING &&
      this.isExpired(task.urgency.expiresAt)
    ) {
      const now = admin.firestore.Timestamp.now();
      await taskRef.update({
        status: TaskStatus.EXPIRED,
        updatedAt: now,
      });
      task.status = TaskStatus.EXPIRED;
      task.updatedAt = now;
    }

    return this.transformToResponse(task);
  }

  /**
   * Get paginated tasks with optimized queries
   */
  async getMyTasks(
    userUid: string,
    options: GetTasksOptions,
  ): Promise<PaginatedResponse<TaskResponse>> {
    const {
      type,
      page = TASK_PAGINATION_DEFAULTS.DEFAULT_PAGE,
      limit = TASK_PAGINATION_DEFAULTS.DEFAULT_LIMIT,
      sortBy = TaskSortField.CREATED_AT,
      sortOrder = SortOrder.DESC,
      status,
      reaction,
    } = options;

    const field = type === TaskQueryType.CREATED ? 'createdBy.uid' : 'assignedTo.uid';
    const now = admin.firestore.Timestamp.now();

    // Build query
    let query: admin.firestore.Query = this.firestore
      .collection(TASK_COLLECTIONS.TASKS)
      .where(field, '==', userUid);

    // Apply filters
    if (status) {
      query = query.where('status', '==', status);
    }
    if (reaction) {
      query = query.where('assigneeReaction', '==', reaction);
    }

    // Get total count (for pagination meta)
    const countSnapshot = await query.count().get();
    const totalItems = countSnapshot.data().count;

    // Apply sorting and pagination
    const sortField = sortBy === TaskSortField.EXPIRES_AT ? 'urgency.expiresAt' : sortBy;
    query = query
      .orderBy(sortField, sortOrder)
      .offset((page - 1) * limit)
      .limit(limit);

    const snapshot = await query.get();

    // Process tasks and handle expired status updates
    const tasks: TaskResponse[] = [];
    const batch = this.firestore.batch();
    let hasExpiredUpdates = false;

    for (const doc of snapshot.docs) {
      const data = doc.data() as TaskDocument;
      let taskData = { id: doc.id, ...data } as Task;

      // Auto-update expired tasks
      if (
        data.status === TaskStatus.PENDING &&
        data.urgency.expiresAt.toMillis() <= now.toMillis()
      ) {
        batch.update(doc.ref, {
          status: TaskStatus.EXPIRED,
          updatedAt: now,
        });
        taskData = {
          ...taskData,
          status: TaskStatus.EXPIRED,
          updatedAt: now,
        };
        hasExpiredUpdates = true;
      }

      tasks.push(this.transformToResponse(taskData));
    }

    // Commit batch update for expired tasks
    if (hasExpiredUpdates) {
      await batch.commit();
      this.logger.log('Batch updated expired tasks');
    }

    return {
      items: tasks,
      meta: this.buildPaginationMeta(totalItems, page, limit),
    };
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    userUid?: string,
  ): Promise<TaskResponse> {
    const taskRef = this.firestore.collection(TASK_COLLECTIONS.TASKS).doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      throw new NotFoundException(TASK_ERROR_MESSAGES.TASK_NOT_FOUND);
    }

    const taskData = taskDoc.data() as TaskDocument;

    // Authorization checks
    if (userUid) {
      if (status === TaskStatus.CANCELLED && taskData.createdBy.uid !== userUid) {
        throw new ForbiddenException(TASK_ERROR_MESSAGES.ONLY_CREATOR_CAN_CANCEL);
      }

      if (status === TaskStatus.COMPLETED && taskData.assignedTo.uid !== userUid) {
        throw new ForbiddenException(TASK_ERROR_MESSAGES.ONLY_ASSIGNEE_CAN_COMPLETE);
      }
    }

    // Validate status transitions
    if (taskData.status === TaskStatus.EXPIRED) {
      throw new BadRequestException(TASK_ERROR_MESSAGES.CANNOT_UPDATE_EXPIRED);
    }
    if (taskData.status === TaskStatus.COMPLETED) {
      throw new BadRequestException(TASK_ERROR_MESSAGES.ALREADY_COMPLETED);
    }
    if (taskData.status === TaskStatus.CANCELLED) {
      throw new BadRequestException(TASK_ERROR_MESSAGES.ALREADY_CANCELLED);
    }

    const now = admin.firestore.Timestamp.now();
    await taskRef.update({
      status,
      updatedAt: now,
    });

    const updatedTask: Task = {
      id: taskId,
      ...taskData,
      status,
      updatedAt: now,
    };

    return this.transformToResponse(updatedTask);
  }

  /**
   * Update task reaction with running late extension
   */
  async updateTaskReaction(
    taskId: string,
    reaction: TaskReaction,
    userUid: string,
  ): Promise<TaskResponse> {
    const taskRef = this.firestore.collection(TASK_COLLECTIONS.TASKS).doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      throw new NotFoundException(TASK_ERROR_MESSAGES.TASK_NOT_FOUND);
    }

    const taskData = taskDoc.data() as TaskDocument;

    // Only assignee can set reaction
    if (taskData.assignedTo.uid !== userUid) {
      throw new ForbiddenException(TASK_ERROR_MESSAGES.ONLY_ASSIGNEE_CAN_REACT);
    }

    // Can't react to non-pending tasks
    if (taskData.status !== TaskStatus.PENDING) {
      throw new BadRequestException(TASK_ERROR_MESSAGES.CANNOT_REACT);
    }

    const now = admin.firestore.Timestamp.now();
    const updateData: Record<string, unknown> = {
      assigneeReaction: reaction,
      updatedAt: now,
    };

    // Handle "running late" reaction - extend time by 30 minutes
    let newExpiresAt = taskData.urgency.expiresAt;
    let extensionCount = taskData.extensionCount ?? 0;

    if (reaction === TaskReaction.RUNNING_LATE) {
      // Check if max extensions reached
      if (extensionCount >= TASK_TIME_MINUTES.MAX_EXTENSIONS) {
        throw new BadRequestException(TASK_ERROR_MESSAGES.MAX_EXTENSIONS);
      }

      // Extend expiration by 30 minutes
      newExpiresAt = admin.firestore.Timestamp.fromMillis(
        taskData.urgency.expiresAt.toMillis() + TASK_TIME_MS.RUNNING_LATE_EXTENSION,
      );
      extensionCount += 1;

      // Update TTL as well
      const newTtl = admin.firestore.Timestamp.fromMillis(
        newExpiresAt.toMillis() + TASK_TIME_MS.DEFAULT_TTL_AFTER_EXPIRY,
      );

      updateData['urgency.expiresAt'] = newExpiresAt;
      updateData['extensionCount'] = extensionCount;
      updateData['ttl'] = newTtl;

      this.logger.log(
        `Task ${taskId} extended by 30 minutes (extension #${extensionCount})`,
      );
    }

    await taskRef.update(updateData);

    // Send notification to task creator
    try {
      await this.notyService.sendTaskReactionNotification({
        taskId,
        creatorUid: taskData.createdBy.uid,
        assigneeUid: taskData.assignedTo.uid,
        assigneeName: taskData.assignedTo.name,
        taskTitle: taskData.title,
        reaction,
      });
    } catch (error) {
      this.logger.warn(`Failed to send reaction notification for task ${taskId}:`, error);
    }

    const updatedTask: Task = {
      id: taskId,
      ...taskData,
      assigneeReaction: reaction,
      updatedAt: now,
      urgency: {
        ...taskData.urgency,
        expiresAt: newExpiresAt,
      },
      extensionCount,
    };

    return this.transformToResponse(updatedTask);
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string, userUid: string): Promise<void> {
    const taskRef = this.firestore.collection(TASK_COLLECTIONS.TASKS).doc(taskId);
    const taskDoc = await taskRef.get();

    if (!taskDoc.exists) {
      throw new NotFoundException(TASK_ERROR_MESSAGES.TASK_NOT_FOUND);
    }

    const taskData = taskDoc.data() as TaskDocument;

    // Only creator can delete
    if (taskData.createdBy.uid !== userUid) {
      throw new ForbiddenException(TASK_ERROR_MESSAGES.ONLY_CREATOR_CAN_DELETE);
    }

    await taskRef.delete();
    this.logger.log(`Task ${taskId} deleted by user ${userUid}`);
  }
}
