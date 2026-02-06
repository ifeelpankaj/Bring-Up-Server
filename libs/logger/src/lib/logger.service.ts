import {
  Inject,
  Injectable,
  LoggerService as NestLoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class AppLogger implements NestLoggerService {
  private context?: string;
  private winstonLogger: Logger;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger | { logger: Logger },
  ) {
    this.winstonLogger =
      'logger' in this.logger ? this.logger.logger : this.logger;
  }

  /**
   * Creates a new scoped logger instance with its own context.
   * Use this instead of setContext() to avoid shared state issues.
   */
  forContext(context: string): AppLogger {
    const scoped = Object.create(this) as AppLogger;
    scoped.context = context;
    scoped.winstonLogger = this.winstonLogger;
    return scoped;
  }

  /**
   * @deprecated Use forContext() instead to avoid shared state issues in singleton scope
   */
  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: string) {
    const ctx = context || this.context || 'Application';
    this.winstonLogger.info(message, { context: ctx });
  }

  error(message: string, trace?: string | Error, context?: string) {
    const ctx = context || this.context || 'Application';

    if (trace instanceof Error) {
      this.winstonLogger.error(message, {
        context: ctx,
        trace: trace.stack,
        error: {
          name: trace.name,
          message: trace.message,
        },
      });
    } else {
      this.winstonLogger.error(message, { context: ctx, trace });
    }
  }

  warn(message: string, context?: string) {
    const ctx = context || this.context || 'Application';
    this.winstonLogger.warn(message, { context: ctx });
  }

  debug(message: string, context?: string) {
    const ctx = context || this.context || 'Application';
    this.winstonLogger.debug(message, { context: ctx });
  }

  verbose(message: string, context?: string) {
    const ctx = context || this.context || 'Application';
    this.winstonLogger.verbose(message, { context: ctx });
  }

  logWithMetadata(
    message: string,
    metadata: Record<string, unknown>,
    context?: string,
  ) {
    const ctx = context || this.context || 'Application';
    this.winstonLogger.info(message, { context: ctx, ...metadata });
  }

  errorWithMetadata(
    message: string,
    error: Error,
    metadata?: Record<string, unknown>,
    context?: string,
  ) {
    const ctx = context || this.context || 'Application';
    this.winstonLogger.error(message, {
      context: ctx,
      trace: error.stack,
      error: {
        name: error.name,
        message: error.message,
      },
      ...metadata,
    });
  }
}
