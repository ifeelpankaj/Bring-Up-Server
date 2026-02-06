import { Logger } from '@nestjs/common';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  IsString,
  Matches,
  Max,
  Min,
  NotEquals,
  ValidateIf,
  validateSync,
  ValidationError,
} from 'class-validator';



class EnvironmentVaribale {

  @Type(() => Number)
  @IsNumber({}, { message: 'PORT must be a valid number' })
  @Min(1000, { message: 'PORT must be at least 1000' })
  @Max(65535, { message: 'PORT must be less than 65535' })
  PORT!: number;
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.split(',').map((origin: string) => origin.trim())
      : []
  )
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^https?:\/\/.+$/, { each: true })
  @ValidateIf((env) => env.NODE_ENV === 'production')
  @NotEquals('*')
  ALLOWED_ORIGINS!: string[];

  
}

const logger = new Logger('ConfigValidation');

function formatValidationError(errors: ValidationError[]): string {
  return errors
    .map((err) => {
      const constraints = err.constraints || {};
      const msg = Object.values(constraints);

      return ` ✗ ${err.property} : ${msg.join(', ')} `;
    })
    .join('\n');
}
export function validateEnv(config: Record<string, unknown>) {
  logger.debug('Validating Environment varibale is in progress...');

  const cleanConfig = Object.entries(config).reduce((acc, [key, value]) => {
    acc[key] = value === '' ? undefined : value;
    return acc;
  }, {} as Record<string, unknown>);
  const validateConfig = plainToInstance(EnvironmentVaribale, cleanConfig, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validateConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const formattedErrors = formatValidationError(errors);

    logger.error('Environment Validation Failed');
    logger.error(formattedErrors);

    console.error(`\n ✗ Please fix the above env varibale in your .env file\n`);
    process.exit(1);
  }
  logger.log('✓ Environment varibale validated successfully');
}
