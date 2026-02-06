import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { SuccessResponse, ResponseBuilder } from '@bringup/shared';
import { AppConfigService } from '@bringup/config';
import { AppLogger } from '@bringup/logger';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T>>
{
  constructor(
    private readonly configService: AppConfigService,
    private readonly logger: AppLogger,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();

    // Log request details only in development environment
    if (this.configService.isDevelopment) {
      this.logger.logWithMetadata(
        `Incoming Request: ${request.method} ${request.url}`,
        {
          method: request.method,
          url: request.url,
          headers: request.headers,
          query: request.query,
          body: request.body,
          userAgent: request.get('user-agent'),
          ip: request.ip,
        },
        'ResponseInterceptor',
      );
    }

    return next.handle().pipe(
      map((data) => {
        // If already wrapped, pass through
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'statusCode' in data
        ) {
          return data;
        }

        // Wrap response in standard format using ResponseBuilder
        const response = ResponseBuilder.success(data, request.url);

        // Log response details only in development environment
        if (this.configService.isDevelopment) {
          this.logger.logWithMetadata(
            `Outgoing Response: ${request.method} ${request.url}`,
            {
              method: request.method,
              url: request.url,
              responseData: data,
              success: true,
            },
            'ResponseInterceptor',
          );
        }

        return response;
      }),
    );
  }
}
