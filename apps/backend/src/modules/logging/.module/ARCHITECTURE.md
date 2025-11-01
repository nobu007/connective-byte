# Logging Module - Architecture

## Architectural Overview

The Logging module follows clean architecture principles with clear separation between configuration, formatting, and transport layers.

## Layer Structure

```
┌─────────────────────────────────────────────┐
│         Controller Layer (Optional)          │
│  LoggingController extends BaseController    │
│  - Get current log configuration             │
│  - Update log level at runtime               │
│  - Retrieve recent logs (if buffered)        │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│         Service Layer (Core Logic)           │
│  LoggingService extends BaseService          │
│  - Log level filtering                       │
│  - Metadata enrichment                       │
│  - Format selection (JSON/pretty)            │
│  - Transport management                      │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│         Formatter Layer (Output)             │
│  - JsonFormatter: Production JSON logs       │
│  - PrettyFormatter: Development readable     │
│  - CustomFormatter: Extensibility            │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│         Transport Layer (Destination)        │
│  - ConsoleTransport: stdout/stderr           │
│  - FileTransport: Write to log files         │
│  - ExternalTransport: Send to services       │
└─────────────────────────────────────────────┘
```

## Component Diagram

### LoggingService (Core Business Logic)

**Responsibilities:**

- Filter logs based on configured log level
- Enrich log entries with metadata (timestamp, service name, etc.)
- Apply formatters to log entries
- Route logs to appropriate transports
- Provide centralized logging interface

**Dependencies:**

- BaseService (common/base)
- Logger type (common/types)

**Extension Points:**

- `registerFormatter(name, fn)` - Add custom log formatters
- `registerTransport(name, transport)` - Add custom log destinations
- `setLogLevel(level)` - Change log level at runtime

### LoggingController (HTTP Interface - Optional)

**Responsibilities:**

- Provide API endpoint for log configuration
- Allow runtime log level changes
- Expose logging metrics (optional)

**Dependencies:**

- BaseController (common/base)
- LoggingService (services)

### Formatters

**JsonFormatter:**

```typescript
{
  "level": "info",
  "message": "Request processed",
  "timestamp": "2025-10-15T12:34:56.789Z",
  "service": "backend",
  "metadata": {
    "requestId": "abc-123",
    "duration": 45
  }
}
```

**PrettyFormatter:**

```
[2025-10-15 12:34:56] INFO backend: Request processed
  requestId: abc-123
  duration: 45ms
```

## Data Flow

```
1. Application calls logger.info("message", metadata)
2. LoggingService receives log entry
3. Service checks if log level is enabled
4. Service enriches entry with timestamp, service name
5. Service applies configured formatter
6. Service sends to all registered transports
7. Transports output to destinations (console, file, etc.)
```

## Design Patterns

1. **Singleton Pattern**: Single global logger instance
2. **Strategy Pattern**: Pluggable formatters and transports
3. **Decorator Pattern**: Metadata enrichment wraps log entries
4. **Factory Pattern**: Create formatters and transports

## Extension Points

### Adding a Custom Formatter

```typescript
import { loggingService } from '../services/loggingService';

loggingService.registerFormatter('custom', (entry) => {
  return `[${entry.level}] ${entry.message}`;
});
```

### Adding a Custom Transport

```typescript
import { loggingService } from '../services/loggingService';

loggingService.registerTransport('file', {
  log: (formatted) => {
    fs.appendFileSync('/var/log/app.log', formatted + '\n');
  },
});
```

### Creating a Context-Aware Logger

```typescript
import { createLogger } from '../services/loggingService';

const requestLogger = createLogger({
  requestId: req.id,
  userId: req.user?.id,
});

requestLogger.info('User action', { action: 'login' });
// Automatically includes requestId and userId in all logs
```

## Technology Stack

- **TypeScript**: Type safety for log entries
- **BaseService**: Reusable service abstraction
- **Environment Variables**: Runtime configuration
- **Streams**: Efficient log output

## Configuration

### Environment Variables

- `LOG_LEVEL`: Minimum log level (debug, info, warn, error)
- `LOG_FORMAT`: Output format (json, pretty)
- `LOG_ENABLED`: Enable/disable logging (true, false)

### Example Configuration

```typescript
// Development
LOG_LEVEL = debug;
LOG_FORMAT = pretty;

// Production
LOG_LEVEL = info;
LOG_FORMAT = json;
```

## Future Enhancements

1. **Log Rotation**: Automatically rotate log files by size/date
2. **Remote Logging**: Send logs to external services (Datadog, Splunk)
3. **Log Sampling**: Sample high-volume logs to reduce overhead
4. **Structured Errors**: Enhanced error logging with stack traces
5. **Performance Monitoring**: Track logging performance metrics
