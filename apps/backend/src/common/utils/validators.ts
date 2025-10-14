/**
 * Validation Utilities
 * Reusable validation functions following DRY principle
 * Provides common validation patterns used across services
 */

import { ValidationError } from '../types';

/**
 * Validation result type
 */
export type ValidationResult = ValidationError[] | null;

/**
 * Check if value is not null or undefined
 */
export function isRequired(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}

/**
 * Validate required field
 */
export function validateRequired(
  field: string,
  value: unknown
): ValidationError | null {
  if (!isRequired(value)) {
    return {
      field,
      message: `${field} is required`,
      code: 'REQUIRED_FIELD',
    };
  }
  return null;
}

/**
 * Validate string length
 */
export function validateStringLength(
  field: string,
  value: string,
  min?: number,
  max?: number
): ValidationError | null {
  if (min !== undefined && value.length < min) {
    return {
      field,
      message: `${field} must be at least ${min} characters`,
      code: 'MIN_LENGTH',
    };
  }

  if (max !== undefined && value.length > max) {
    return {
      field,
      message: `${field} must be at most ${max} characters`,
      code: 'MAX_LENGTH',
    };
  }

  return null;
}

/**
 * Validate email format
 */
export function validateEmail(field: string, value: string): ValidationError | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(value)) {
    return {
      field,
      message: `${field} must be a valid email address`,
      code: 'INVALID_EMAIL',
    };
  }

  return null;
}

/**
 * Validate number range
 */
export function validateNumberRange(
  field: string,
  value: number,
  min?: number,
  max?: number
): ValidationError | null {
  if (min !== undefined && value < min) {
    return {
      field,
      message: `${field} must be at least ${min}`,
      code: 'MIN_VALUE',
    };
  }

  if (max !== undefined && value > max) {
    return {
      field,
      message: `${field} must be at most ${max}`,
      code: 'MAX_VALUE',
    };
  }

  return null;
}

/**
 * Validate enum value
 */
export function validateEnum<T>(
  field: string,
  value: T,
  allowedValues: T[]
): ValidationError | null {
  if (!allowedValues.includes(value)) {
    return {
      field,
      message: `${field} must be one of: ${allowedValues.join(', ')}`,
      code: 'INVALID_ENUM',
    };
  }

  return null;
}

/**
 * Combine multiple validation results
 */
export function combineValidations(
  ...validations: (ValidationError | null)[]
): ValidationResult {
  const errors = validations.filter((v): v is ValidationError => v !== null);
  return errors.length > 0 ? errors : null;
}

/**
 * Validation builder for fluent API
 */
export class ValidationBuilder {
  private errors: ValidationError[] = [];

  required(field: string, value: unknown): this {
    const error = validateRequired(field, value);
    if (error) this.errors.push(error);
    return this;
  }

  stringLength(field: string, value: string, min?: number, max?: number): this {
    const error = validateStringLength(field, value, min, max);
    if (error) this.errors.push(error);
    return this;
  }

  email(field: string, value: string): this {
    const error = validateEmail(field, value);
    if (error) this.errors.push(error);
    return this;
  }

  numberRange(field: string, value: number, min?: number, max?: number): this {
    const error = validateNumberRange(field, value, min, max);
    if (error) this.errors.push(error);
    return this;
  }

  enum<T>(field: string, value: T, allowedValues: T[]): this {
    const error = validateEnum(field, value, allowedValues);
    if (error) this.errors.push(error);
    return this;
  }

  custom(validation: ValidationError | null): this {
    if (validation) this.errors.push(validation);
    return this;
  }

  build(): ValidationResult {
    return this.errors.length > 0 ? this.errors : null;
  }
}
