# Logging Module - Expected Behavior

## Input

### Log Method Calls

```typescript
// Basic logging
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);

// With metadata
logger.info('User logged in', { userId: 123, ip: '127.0.0.1' });

// With error object
logger.error('Database connection failed', dbError, { retries: 3 });
```

### Configuration

```typescript
// Environment variables
LOG_LEVEL = debug | info | warn | error;
LOG_FORMAT = json | pretty;
LOG_ENABLED = true | false;

// Runtime configuration
loggingService.setLogLevel('info');
loggingService.setFormat('json');
```

## Processing Flow

### 1. Log Entry Creation

```
Application → logger.info(message, metadata)
    ↓
Create LogEntry object
    {
      level: 'info',
      message: string,
      metadata: object,
      timestamp: Date
    }
```

### 2. Level Filtering

```
LogEntry → LoggingService
    ↓
Check if entry.level >= configured LOG_LEVEL
    ↓
If below threshold: discard (no output)
If at or above: proceed to formatting
```

### 3. Metadata Enrichment

```
LogEntry → Add system metadata
    {
      ...originalEntry,
      service: 'backend',
      hostname: os.hostname(),
      pid: process.pid
    }
```

### 4. Formatting

```
Enriched Entry → Apply formatter (JSON or Pretty)
    ↓
JSON: {"level":"info","message":"...","timestamp":"..."}
Pretty: [2025-10-15 12:34] INFO: ...
```

### 5. Transport

```
Formatted String → Send to all transports
    ↓
Console: stdout (info/debug) or stderr (warn/error)
File: append to log file (if configured)
```

## Output

### JSON Format (Production)

```json
{
  "level": "info",
  "message": "User logged in",
  "timestamp": "2025-10-15T12:34:56.789Z",
  "service": "backend",
  "metadata": {
    "userId": 123,
    "ip": "127.0.0.1"
  }
}
```

### Pretty Format (Development)

```
[2025-10-15 12:34:56] INFO backend: User logged in
  userId: 123
  ip: 127.0.0.1
```

### Error Logging

```json
{
  "level": "error",
  "message": "Database connection failed",
  "timestamp": "2025-10-15T12:35:00.123Z",
  "service": "backend",
  "error": {
    "name": "ConnectionError",
    "message": "ECONNREFUSED",
    "stack": "Error: ECONNREFUSED\n  at ..."
  },
  "metadata": {
    "retries": 3
  }
}
```

## Error Handling

### Invalid Log Level

```typescript
// Input
logger.setLogLevel('invalid');

// Behavior
- Log warning about invalid level
- Fall back to 'info' level
- Continue operation (no crash)
```

### Missing Metadata

```typescript
// Input
logger.info('Message', undefined);

// Behavior
- Handle gracefully
- Output message without metadata
- No errors thrown
```

### Formatter Error

```typescript
// If formatter throws
- Catch error internally
- Output plain text fallback
- Log formatter error separately
```

## Performance Characteristics

### Log Level Filtering (Fast Path)

```
Debug log with LOG_LEVEL=info
    ↓
Immediate return (< 0.01ms)
No formatting or transport overhead
```

### Active Logging

```
Info log with LOG_LEVEL=info
    ↓
Format + Transport (< 1ms)
Minimal impact on request processing
```

## Edge Cases

### Circular References in Metadata

```typescript
const obj: any = { name: 'test' };
obj.self = obj;
logger.info('Test', obj);

// Behavior
- JSON formatter detects circular reference
- Replaces with '[Circular]' placeholder
- Logs successfully without crash
```

### Large Metadata Objects

```typescript
logger.info('Large data', { bigArray: Array(10000).fill('x') });

// Behavior
- Truncate metadata if > 10KB (configurable)
- Add truncation indicator
- Prevent log file explosion
```

### Null/Undefined Messages

```typescript
logger.info(null);
logger.info(undefined);

// Behavior
- Convert to string representation
- Log as 'null' or 'undefined'
- No errors thrown
```

## Integration Behavior

### With BaseController

```typescript
class MyController extends BaseController {
  constructor() {
    super('MyController', loggingService.createLogger('MyController'));
  }
}

// Behavior
- All controller actions automatically log with context
- Errors logged with full request details
```

### With BaseService

```typescript
class MyService extends BaseService {
  constructor() {
    super('MyService', loggingService.createLogger('MyService'));
  }
}

// Behavior
- All service operations log start/end
- Errors logged with operation context
```

## Backwards Compatibility

### Existing Logger Interface

```typescript
// Current Logger interface remains unchanged
interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

// Behavior
- Existing code continues to work
- No breaking changes to Logger type
```
