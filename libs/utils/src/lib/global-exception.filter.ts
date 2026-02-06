import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { FirebaseError } from 'firebase-admin';
import { AppLogger } from '@bringup/logger';
import { ErrorResponse, HttpExceptionResponse, ResponseBuilder } from '@bringup/shared';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly scopedLogger: AppLogger;

  constructor(private readonly logger: AppLogger) {
    this.scopedLogger = this.logger.forContext('HTTP');
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const errorResponse = this.resolveError(exception, req.url);

    this.scopedLogger.error(
      `${req.method} ${req.url} - ${errorResponse.statusCode}`,
      exception instanceof Error ? exception : new Error(String(exception)),
    );

    res.status(errorResponse.statusCode).json(errorResponse);
  }

  private resolveError(exception: unknown, path: string): ErrorResponse {
    // HTTP Exception (most common)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse() as HttpExceptionResponse;
      const isValidation = Array.isArray(response.message);

      const message = isValidation
        ? 'Validation failed'
        : typeof response.message === 'string'
          ? response.message
          : 'Bad Request';

      const validationErrors = isValidation
        ? (response.message as string[]).map((msg: string) => ({
            field: msg.split(' ')[0],
            message: msg,
          }))
        : undefined;

      return ResponseBuilder.error(status, message, path, response.error || 'HTTP_EXCEPTION', {
        validationErrors,
      });
    }

    // Firebase/Firestore Errors
    if (this.isFirebaseError(exception)) {
      return this.handleFirebaseError(exception, path);
    }

    // Generic fallback
    return ResponseBuilder.error(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Internal server error',
      path,
      'INTERNAL_ERROR',
    );
  }

  private isFirebaseError(exception: unknown): exception is FirebaseError {
    return (
      exception !== null &&
      typeof exception === 'object' &&
      'code' in exception &&
      typeof (exception as FirebaseError).code === 'string'
    );
  }

  private handleFirebaseError(exception: FirebaseError, path: string): ErrorResponse {
    const errorCode = exception.code;

    // Map Firebase error codes to HTTP status codes and messages
    const errorMapping: Record<
      string,
      { status: HttpStatus; message: string; code: string }
    > = {
      // Firestore errors
      'not-found': {
        status: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
        code: 'NOT_FOUND',
      },
      'already-exists': {
        status: HttpStatus.CONFLICT,
        message: 'Resource already exists',
        code: 'DUPLICATE_KEY',
      },
      'permission-denied': {
        status: HttpStatus.FORBIDDEN,
        message: 'Permission denied',
        code: 'PERMISSION_DENIED',
      },
      unauthenticated: {
        status: HttpStatus.UNAUTHORIZED,
        message: 'Authentication required',
        code: 'UNAUTHENTICATED',
      },
      'invalid-argument': {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid argument provided',
        code: 'INVALID_ARGUMENT',
      },
      'failed-precondition': {
        status: HttpStatus.BAD_REQUEST,
        message: 'Operation failed precondition',
        code: 'FAILED_PRECONDITION',
      },
      aborted: {
        status: HttpStatus.CONFLICT,
        message: 'Operation aborted due to conflict',
        code: 'ABORTED',
      },
      'out-of-range': {
        status: HttpStatus.BAD_REQUEST,
        message: 'Value out of range',
        code: 'OUT_OF_RANGE',
      },
      unimplemented: {
        status: HttpStatus.NOT_IMPLEMENTED,
        message: 'Operation not implemented',
        code: 'UNIMPLEMENTED',
      },
      internal: {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal error',
        code: 'INTERNAL_ERROR',
      },
      unavailable: {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE',
      },
      'data-loss': {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Data loss or corruption',
        code: 'DATA_LOSS',
      },
      'deadline-exceeded': {
        status: HttpStatus.GATEWAY_TIMEOUT,
        message: 'Operation timed out',
        code: 'TIMEOUT',
      },
      'resource-exhausted': {
        status: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Resource exhausted (rate limit)',
        code: 'RATE_LIMITED',
      },
      cancelled: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Operation cancelled',
        code: 'CANCELLED',
      },
    };

    // Extract the error type from codes like "firestore/not-found"
    const errorType = errorCode.includes('/')
      ? errorCode.split('/')[1]
      : errorCode;

    const mapping = errorMapping[errorType] || {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database error',
      code: 'DATABASE_ERROR',
    };

    return ResponseBuilder.error(mapping.status, mapping.message, path, mapping.code, {
      details: { firebaseCode: errorCode },
    });
  }
}
