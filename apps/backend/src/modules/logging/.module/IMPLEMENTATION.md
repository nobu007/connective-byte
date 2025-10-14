# Logging Module - Implementation Details

## Core Classes

### LoggingService

**File**: `apps/backend/src/services/loggingService.ts`

**Extends**: `BaseService`

**Responsibilities**:
- Manage log level configuration
- Create logger instances with context
- Route log entries to formatters and transports
- Provide centralized logging interface

**Public Methods**:

```typescript
class LoggingService extends BaseService {
  // Create a logger with specific context
  createLogger(context: string): Logger;

  // Set global log level
  setLogLevel(level: LogLevel): void;

  // Get current log level
  getLogLevel(): LogLevel;

  // Register custom formatter
  registerFormatter(name: string, formatter: LogFormatter): void;

  // Register custom transport
  registerTransport(name: string, transport: LogTransport): void;

  // Get logging configuration
  getConfig(): LoggingConfig;
}
```

**Implementation**:

```typescript
import { BaseService } from '../common/base/BaseService';
import { Logger, LogLevel, LogEntry, ServiceResult } from '../common/types';

export class LoggingService extends BaseService {
  private logLevel: LogLevel;
  private format: 'json' | 'pretty';
  private formatters: Map<string, LogFormatter>;
  private transports: Map<string, LogTransport>;

  constructor() {
    super('LoggingService');
    this.logLevel = this.getLogLevelFromEnv();
    this.format = process.env.LOG_FORMAT === 'json' ? 'json' : 'pretty';
    this.formatters = new Map();
    this.transports = new Map();

    // Register default formatters
    this.registerFormatter('json', new JsonFormatter());
    this.registerFormatter('pretty', new PrettyFormatter());

    // Register default transports
    this.registerTransport('console', new ConsoleTransport());
  }

  createLogger(context: string): Logger {
    return {
      debug: (message: string, meta?: Record<string, unknown>) =>
        this.log('debug', message, context, meta),
      info: (message: string, meta?: Record<string, unknown>) =>
        this.log('info', message, context, meta),
      warn: (message: string, meta?: Record<string, unknown>) =>
        this.log('warn', message, context, meta),
      error: (message: string, error?: Error, meta?: Record<string, unknown>) =>
        this.log('error', message, context, { ...meta, error }),
    };
  }

  private log(
    level: LogLevel,
    message: string,
    context: string,
    metadata?: Record<string, unknown>
  ): void {
    // Fast path: skip if below log level
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
      metadata: this.enrichMetadata(metadata),
    };

    const formatted = this.formatEntry(entry);
    this.outputToTransports(formatted, level);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private enrichMetadata(metadata?: Record<string, unknown>): Record<string, unknown> {
    return {
      ...metadata,
      service: 'backend',
      hostname: require('os').hostname(),
      pid: process.pid,
    };
  }

  private formatEntry(entry: LogEntry): string {
    const formatter = this.formatters.get(this.format);
    if (!formatter) {
      return JSON.stringify(entry); // Fallback
    }

    try {
      return formatter.format(entry);
    } catch (error) {
      // Formatter error - use fallback
      return JSON.stringify(entry);
    }
  }

  private outputToTransports(formatted: string, level: LogLevel): void {
    this.transports.forEach(transport => {
      try {
        transport.log(formatted, level);
      } catch (error) {
        // Prevent transport errors from crashing app
        console.error('Transport error:', error);
      }
    });
  }

  private getLogLevelFromEnv(): LogLevel {
    const level = process.env.LOG_LEVEL?.toLowerCase();
    const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

    if (level && validLevels.includes(level as LogLevel)) {
      return level as LogLevel;
    }

    return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.logger.info(`Log level changed to: ${level}`);
  }

  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  registerFormatter(name: string, formatter: LogFormatter): void {
    this.formatters.set(name, formatter);
  }

  registerTransport(name: string, transport: LogTransport): void {
    this.transports.set(name, transport);
  }

  getConfig(): LoggingConfig {
    return {
      level: this.logLevel,
      format: this.format,
      transports: Array.from(this.transports.keys()),
    };
  }
}

// Export singleton instance
export const loggingService = new LoggingService();
```

## Formatters

### JsonFormatter

**File**: `apps/backend/src/modules/logging/formatters/JsonFormatter.ts`

```typescript
import { LogEntry, LogFormatter } from '../../../common/types';

export class JsonFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const output = {
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp.toISOString(),
      context: entry.context,
      ...entry.metadata,
    };

    return JSON.stringify(output);
  }
}
```

### PrettyFormatter

**File**: `apps/backend/src/modules/logging/formatters/PrettyFormatter.ts`

```typescript
import { LogEntry, LogFormatter } from '../../../common/types';

export class PrettyFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString().replace('T', ' ').substring(0, 19);
    const level = entry.level.toUpperCase().padEnd(5);
    const context = entry.context.padEnd(15);

    let output = `[${timestamp}] ${level} ${context}: ${entry.message}`;

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      const metaStr = Object.entries(entry.metadata)
        .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
        .join('\n');
      output += '\n' + metaStr;
    }

    return output;
  }
}
```

## Transports

### ConsoleTransport

**File**: `apps/backend/src/modules/logging/transports/ConsoleTransport.ts`

```typescript
import { LogLevel, LogTransport } from '../../../common/types';

export class ConsoleTransport implements LogTransport {
  log(formatted: string, level: LogLevel): void {
    if (level === 'error' || level === 'warn') {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }
}
```

## Type Definitions

**File**: `apps/backend/src/common/types/index.ts` (additions)

```typescript
// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Log entry structure
export interface LogEntry {
  level: LogLevel;
  message: string;
  context: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Formatter interface
export interface LogFormatter {
  format(entry: LogEntry): string;
}

// Transport interface
export interface LogTransport {
  log(formatted: string, level: LogLevel): void;
}

// Logging configuration
export interface LoggingConfig {
  level: LogLevel;
  format: 'json' | 'pretty';
  transports: string[];
}
```

## Controller (Optional)

### LoggingController

**File**: `apps/backend/src/controllers/loggingController.ts`

```typescript
import { Request, Response } from 'express';
import { BaseController } from '../common/base/BaseController';
import { loggingService } from '../services/loggingService';

export class LoggingController extends BaseController {
  constructor() {
    super('LoggingController', loggingService.createLogger('LoggingController'));
  }

  /**
   * Get current logging configuration
   * GET /api/logging/config
   */
  async handleGetConfig(req: Request, res: Response): Promise<void> {
    await this.executeAction(req, res, async () => {
      const config = loggingService.getConfig();
      this.sendSuccess(res, config);
    });
  }

  /**
   * Update log level
   * PUT /api/logging/config
   */
  async handleUpdateConfig(req: Request, res: Response): Promise<void> {
    await this.executeAction(req, res, async () => {
      const { level } = req.body;

      const validLevels = ['debug', 'info', 'warn', 'error'];
      if (!validLevels.includes(level)) {
        this.sendError(res, 'Invalid log level', 400);
        return;
      }

      loggingService.setLogLevel(level);
      this.sendSuccess(res, { level }, 200);
    });
  }
}

export const loggingController = new LoggingController();

// Export handler functions
export const handleGetConfig = (req: Request, res: Response) =>
  loggingController.handleGetConfig(req, res);

export const handleUpdateConfig = (req: Request, res: Response) =>
  loggingController.handleUpdateConfig(req, res);
```

## Integration Pattern

### Updating BaseController and BaseService

**File**: `apps/backend/src/common/base/BaseController.ts`

```typescript
// Change from default logger to loggingService
import { loggingService } from '../../services/loggingService';

export abstract class BaseController {
  protected readonly logger: Logger;

  constructor(controllerName: string, logger?: Logger) {
    this.controllerName = controllerName;
    // Use loggingService if no logger provided
    this.logger = logger || loggingService.createLogger(controllerName);
  }
}
```

**File**: `apps/backend/src/common/base/BaseService.ts`

```typescript
// Change from default logger to loggingService
import { loggingService } from '../../services/loggingService';

export abstract class BaseService {
  protected readonly logger: Logger;

  constructor(serviceName: string, logger?: Logger) {
    this.serviceName = serviceName;
    // Use loggingService if no logger provided
    this.logger = logger || loggingService.createLogger(serviceName);
  }
}
```

## Configuration

### Environment Variables

```bash
# .env file
LOG_LEVEL=debug       # debug | info | warn | error
LOG_FORMAT=pretty     # json | pretty
LOG_ENABLED=true      # true | false
```

## Dependencies

- **Internal**: BaseService, common types
- **External**: None (uses built-in Node.js)
- **Dev Dependencies**: Jest, ts-jest

## Migration Guide

### For Existing Modules

No changes required! Existing modules will automatically use the new logging system:

```typescript
// Before (still works)
class MyService extends BaseService {
  constructor() {
    super('MyService');
    this.logger.info('Service initialized');
  }
}

// After (also works, more control)
class MyService extends BaseService {
  constructor() {
    super('MyService', loggingService.createLogger('MyService'));
    this.logger.info('Service initialized');
  }
}
```
