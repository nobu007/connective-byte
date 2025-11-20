export type LabErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'RESOURCE_LIMIT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_ERROR'
  | 'KEY_ERROR';

export class LabError extends Error {
  constructor(
    public code: LabErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LabError';
  }
}

export class SessionNotFoundError extends LabError {
  constructor(details?: Record<string, unknown>) {
    super('SESSION_NOT_FOUND', 'Sandbox session could not be found', details);
  }
}

export class ResourceLimitError extends LabError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('RESOURCE_LIMIT', message, details);
  }
}

export class ProviderUnavailableError extends LabError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('PROVIDER_UNAVAILABLE', message, details);
  }
}

export class ProviderExecutionError extends LabError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('PROVIDER_ERROR', message, details);
  }
}

export class APIKeyError extends LabError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('KEY_ERROR', message, details);
  }
}
