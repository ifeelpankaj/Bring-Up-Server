import { SuccessResponse, ErrorResponse } from '../types/response';

/**
 * Utility class for building standardized API responses
 */
export class ResponseBuilder {
  /**
   * Creates a success response object
   */
  static success<T>(data: T, path: string, message = 'Request successful'): SuccessResponse<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  /**
   * Creates an error response object
   */
  static error(
    statusCode: number,
    message: string,
    path: string,
    code: string,
    options?: {
      details?: Record<string, unknown>;
      validationErrors?: Array<{ field: string; message: string }>;
    },
  ): ErrorResponse {
    return {
      success: false,
      message,
      statusCode,
      path,
      timestamp: new Date().toISOString(),
      error: {
        code,
        ...(options?.details && { details: options.details }),
        ...(options?.validationErrors && { validationErrors: options.validationErrors }),
      },
    };
  }
}
