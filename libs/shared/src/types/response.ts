export interface SuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
  path: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  path: string;
  timestamp: string;
  error: {
    code: string;
    details?: Record<string, unknown>;
    validationErrors?: ValidationError[];
  };
}

export interface HttpExceptionResponse {
  message: string | string[];
  error?: string;
  statusCode?: number;
}
