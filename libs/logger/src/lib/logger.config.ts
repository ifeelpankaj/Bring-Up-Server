/* eslint-disable @typescript-eslint/no-explicit-any */
import * as winston from 'winston';
import * as path from 'path';
import 'winston-daily-rotate-file';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

const isProduction = process.env['NODE_ENV'] === 'production';

// Always use absolute path to root logs directory
const rootDir = process.cwd();
const logDir = path.resolve(rootDir, process.env['LOG_DIR'] || 'logs');

// Contexts that should show in production console (startup-related only)
const PRODUCTION_CONSOLE_CONTEXTS = [
  'Bootstrap',
  'Database',
  'DatabaseModule',
  'ConfigValidation',
  'NestFactory',
  'NestApplication',
  'MongooseModule',
  'FirebaseModule',
];

// Detailed JSON format for file logs
const productionFormat = winston.format.printf(
  ({
    timestamp,
    level,
    message,
    context,
    trace,
    error,
    stack,
    ...metadata
  }) => {
    const logObject: any = {
      '@timestamp': timestamp,
      level,
      message,
      context: context || 'Application',
    };

    if (error) logObject.error = error;
    if (trace) logObject.trace = trace;
    if (stack) logObject.stack = stack;

    if (Object.keys(metadata).length > 0) {
      logObject.metadata = metadata;
    }

    return JSON.stringify(logObject);
  },
);

// Production console format - simple, only startup logs
const productionConsoleFormat = winston.format.combine(
  winston.format.colorize(),
  // Filter: only show startup-related contexts in production console
  winston.format((info) => {
    const context = String(info['context'] || 'Application');
    if (!PRODUCTION_CONSOLE_CONTEXTS.includes(context)) {
      return false; // Don't show in console
    }
    return info;
  })(),
  winston.format.printf(({ level, message, context }) => {
    const ctx = context || 'Application';
    return ` [${ctx}] ${message}`;
  }),
);

// Console transport - filtered in production, full in development
const consoleTransport = new winston.transports.Console({
  level: isProduction ? 'info' : 'debug',
  format: isProduction
    ? productionConsoleFormat
    : winston.format.combine(
        winston.format.colorize(),
        nestWinstonModuleUtilities.format.nestLike('GetThis', {
          prettyPrint: true,
          colors: true,
        }),
      ),
});

// Info transport - logs info, warn, and debug (but NOT error)
const fileInfoTransport = new winston.transports.DailyRotateFile({
  dirname: logDir,
  filename: 'info-%DATE%.log',
  level: 'info',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    // Filter out error level logs from info file
    winston.format((info) => {
      return info.level === 'error' ? false : info;
    })(),
    productionFormat,
  ),
});

// Error transport - logs ONLY errors
const fileErrorTransport = new winston.transports.DailyRotateFile({
  dirname: logDir,
  filename: 'error-%DATE%.log',
  level: 'error',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '45d',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    productionFormat,
  ),
});

// Both production and development: console + file logs
// Console shows simple messages, files have full details
const transports: winston.transport[] = [
  consoleTransport,
  fileInfoTransport,
  fileErrorTransport,
];

export const loggerConfig: winston.LoggerOptions = {
  level: isProduction ? 'info' : 'debug',
  transports,
  exceptionHandlers: [fileErrorTransport],
  rejectionHandlers: [fileErrorTransport],
};
