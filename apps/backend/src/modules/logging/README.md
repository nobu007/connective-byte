# Logging Module

Centralized structured logging for the ConnectiveByte backend application.

## Features

- **Structured Logging**: Consistent JSON or pretty-formatted logs
- **Configurable Log Levels**: debug, info, warn, error
- **Context-Aware**: Each logger includes its context automatically
- **Metadata Enrichment**: Automatic system metadata (hostname, pid, etc.)
- **Extensible**: Pluggable formatters and transports
- **Performance**: Minimal overhead with fast-path filtering

## Quick Start

### Basic Usage

```typescript
import { loggingService } from '../services/loggingService';

// Create a logger for your module
const logger = loggingService.createLogger('MyModule');

// Log at different levels
logger.debug('Debugging information', { userId: 123 });
logger.info('User logged in', { userId: 123, ip: '127.0.0.1' });
logger.warn('Rate limit approaching', { current: 90, limit: 100 });
logger.error('Database connection failed', dbError, { retries: 3 });
```

### Integration with BaseService/BaseController

BaseService and BaseController automatically use the logging service:

```typescript
import { BaseService } from '../common/base/BaseService';

class MyService extends BaseService {
  constructor() {
    super('MyService'); // Logger automatically created
  }

  async doSomething() {
    this.logger.info('Operation started');
    // ... your code
    this.logger.info('Operation completed');
  }
}
```

## Configuration

### Environment Variables

```bash
# Log level (debug, info, warn, error)
LOG_LEVEL=info

# Format (json, pretty)
LOG_FORMAT=pretty  # Development
LOG_FORMAT=json    # Production
```

### Runtime Configuration

```typescript
import { loggingService } from '../services/loggingService';

// Change log level at runtime
loggingService.setLogLevel('debug');

// Get current configuration
const config = loggingService.getConfig();
console.log(config); // { level: 'debug', format: 'pretty', transports: ['console'] }
```

## Output Formats

### JSON Format (Production)

```json
{
  "level": "info",
  "message": "User logged in",
  "timestamp": "2025-10-15T12:34:56.789Z",
  "context": "AuthService",
  "service": "backend",
  "hostname": "server-1",
  "pid": 12345,
  "userId": 123,
  "ip": "127.0.0.1"
}
```

### Pretty Format (Development)

```
[2025-10-15 12:34:56] INFO  AuthService    : User logged in
  userId: 123
  ip: 127.0.0.1
  service: backend
  hostname: server-1
  pid: 12345
```

## Advanced Usage

### Custom Formatters

```typescript
import { LogEntry, LogFormatter } from '../common/types';

class CustomFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    return `${entry.level}: ${entry.message}`;
  }
}

loggingService.registerFormatter('custom', new CustomFormatter());
```

### Custom Transports

```typescript
import { LogLevel, LogTransport } from '../common/types';
import * as fs from 'fs';

class FileTransport implements LogTransport {
  log(formatted: string, level: LogLevel): void {
    fs.appendFileSync('/var/log/app.log', formatted + '\n');
  }
}

loggingService.registerTransport('file', new FileTransport());
```

## Architecture

```
Application
    ↓
Logger Instance (with context)
    ↓
LoggingService
    ↓
Level Filtering → Metadata Enrichment
    ↓
Formatter (JSON or Pretty)
    ↓
Transports (Console, File, etc.)
    ↓
Output
```

## Log Levels

| Level   | Usage                             | Output |
| ------- | --------------------------------- | ------ |
| `debug` | Detailed debugging information    | stdout |
| `info`  | General informational messages    | stdout |
| `warn`  | Warning messages (degraded state) | stderr |
| `error` | Error messages (failure state)    | stderr |

## Best Practices

### DO ✅

```typescript
// Use context-specific loggers
const logger = loggingService.createLogger('UserService');

// Include relevant metadata
logger.info('User created', { userId: user.id, email: user.email });

// Log errors with error object
logger.error('Failed to create user', error, { email: user.email });

// Use appropriate log levels
logger.debug('Cache hit', { key: 'user:123' });
logger.info('User authenticated', { userId: 123 });
logger.warn('Cache miss rate high', { rate: 0.8 });
logger.error('Database connection lost', error);
```

### DON'T ❌

```typescript
// Don't use console.log/error directly
console.log('User created'); // ❌

// Don't log sensitive information
logger.info('User password changed', { password: newPassword }); // ❌

// Don't log excessive metadata
logger.debug('Data', { bigObject: Array(10000).fill('x') }); // ❌

// Don't use wrong log levels
logger.error('User logged in'); // ❌ (use info)
logger.debug('Database connection failed'); // ❌ (use error)
```

## Performance

- **Log Level Filtering**: < 0.01ms (fast path)
- **Active Logging**: < 1ms (format + transport)
- **Overhead**: Minimal impact on request processing

## Testing

The module includes comprehensive unit tests with > 95% coverage:

```bash
npm test -- loggingService
```

## Documentation

- [MODULE_GOALS.md](.module/MODULE_GOALS.md) - Purpose and objectives
- [ARCHITECTURE.md](.module/ARCHITECTURE.md) - Architecture design
- [BEHAVIOR.md](.module/BEHAVIOR.md) - Expected behavior
- [IMPLEMENTATION.md](.module/IMPLEMENTATION.md) - Implementation details
- [TEST.md](.module/TEST.md) - Test specifications

## Migration Guide

### From Default Logger

No changes required! Existing code continues to work:

```typescript
// Before (still works)
class MyService extends BaseService {
  constructor() {
    super('MyService');
    this.logger.info('Initialized'); // Works automatically
  }
}
```

### Upgrading to Explicit Logger

For more control, create explicit logger:

```typescript
// After (optional)
class MyService extends BaseService {
  constructor() {
    super('MyService', loggingService.createLogger('MyService'));
    this.logger.info('Initialized'); // Same API, more control
  }
}
```

## Troubleshooting

### Logs Not Appearing

Check log level configuration:

```typescript
console.log(loggingService.getLogLevel()); // Check current level
loggingService.setLogLevel('debug'); // Lower threshold
```

### JSON Format in Development

Set environment variable:

```bash
LOG_FORMAT=pretty npm run dev
```

### Performance Issues

- Check for excessive debug logging in production
- Ensure LOG_LEVEL is set to 'info' or higher
- Consider log sampling for high-volume endpoints

## Future Enhancements

- File rotation support
- Remote logging (HTTP transport)
- Log sampling for high-volume logs
- Performance metrics tracking
- Integration with external services (Datadog, Splunk, etc.)
