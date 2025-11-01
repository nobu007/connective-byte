# Logging Module - Test Specifications

## Test Coverage Goals

- **Target Coverage**: > 95%
- **Critical Paths**: 100% (log level filtering, formatting, transport)
- **Edge Cases**: All covered
- **Integration**: Test with BaseService/BaseController

## Test Structure

### Unit Tests - LoggingService

**File**: `apps/backend/src/services/__tests__/loggingService.test.ts`

#### Basic Functionality Tests

```typescript
describe('LoggingService', () => {
  describe('createLogger', () => {
    it('should create logger with context');
    it('should create multiple independent loggers');
  });

  describe('log level filtering', () => {
    it('should log when level >= configured level');
    it('should skip logs when level < configured level');
    it('should respect LOG_LEVEL environment variable');
  });

  describe('setLogLevel', () => {
    it('should update log level dynamically');
    it('should apply new level to all loggers');
  });

  describe('getLogLevel', () => {
    it('should return current log level');
  });

  describe('getConfig', () => {
    it('should return logging configuration');
    it('should include format and transports');
  });
});
```

#### Logger Instance Tests

```typescript
describe('Logger instance', () => {
  describe('debug', () => {
    it('should log debug message with metadata');
    it('should include context in log entry');
    it('should enrich with system metadata');
  });

  describe('info', () => {
    it('should log info message');
    it('should format metadata correctly');
  });

  describe('warn', () => {
    it('should log warning message');
    it('should output to stderr');
  });

  describe('error', () => {
    it('should log error message with error object');
    it('should include stack trace');
    it('should output to stderr');
  });
});
```

#### Formatter Tests

```typescript
describe('Formatters', () => {
  describe('JsonFormatter', () => {
    it('should format entry as valid JSON');
    it('should include all required fields');
    it('should handle circular references');
    it('should format timestamp as ISO string');
  });

  describe('PrettyFormatter', () => {
    it('should format entry as human-readable text');
    it('should align columns correctly');
    it('should indent metadata');
    it('should format timestamp as readable string');
  });

  describe('registerFormatter', () => {
    it('should register custom formatter');
    it('should override existing formatter');
    it('should use custom formatter for logging');
  });
});
```

#### Transport Tests

```typescript
describe('Transports', () => {
  describe('ConsoleTransport', () => {
    it('should output to stdout for info/debug');
    it('should output to stderr for warn/error');
    it('should handle empty messages');
  });

  describe('registerTransport', () => {
    it('should register custom transport');
    it('should send logs to all transports');
    it('should continue if transport throws error');
  });
});
```

#### Edge Cases

```typescript
describe('Edge cases', () => {
  it('should handle null message');
  it('should handle undefined metadata');
  it('should handle circular references in metadata');
  it('should handle very large metadata objects');
  it('should handle formatter errors gracefully');
  it('should handle transport errors gracefully');
  it('should handle invalid log level in setLogLevel');
});
```

#### Performance Tests

```typescript
describe('Performance', () => {
  it('should filter logs quickly (< 0.01ms)');
  it('should format and transport in < 1ms');
  it('should handle 1000 logs/sec without blocking');
});
```

### Unit Tests - LoggingController

**File**: `apps/backend/src/controllers/__tests__/loggingController.test.ts`

```typescript
describe('LoggingController', () => {
  describe('handleGetConfig', () => {
    it('should return 200 with current config');
    it('should include level, format, transports');
  });

  describe('handleUpdateConfig', () => {
    it('should return 200 when updating valid level');
    it('should return 400 for invalid level');
    it('should actually change log level');
    it('should return updated config');
  });

  describe('error handling', () => {
    it('should return 500 if service throws');
  });
});
```

### Integration Tests

**File**: `apps/backend/src/__tests__/logging.integration.test.ts`

```typescript
describe('Logging Integration', () => {
  it('should integrate with BaseService');
  it('should integrate with BaseController');
  it('should integrate with existing health module');
  it('should respect LOG_LEVEL environment variable');
});
```

## Test Coverage Requirements

### Critical Paths (100% coverage required)

- Log level filtering logic
- Log entry creation and enrichment
- Formatter selection and execution
- Transport routing

### Important Paths (95% coverage required)

- Custom formatter registration
- Custom transport registration
- Error handling in formatters/transports
- Configuration methods

### Optional Paths (80% coverage required)

- Controller endpoints (if implemented)
- Advanced metadata handling

## Test Data

### Sample Log Entries

```typescript
const testEntries = {
  simple: {
    level: 'info',
    message: 'Test message',
    context: 'TestContext',
  },
  withMetadata: {
    level: 'info',
    message: 'User action',
    context: 'UserService',
    metadata: { userId: 123, action: 'login' },
  },
  error: {
    level: 'error',
    message: 'Operation failed',
    context: 'DatabaseService',
    error: new Error('Connection timeout'),
  },
};
```

### Expected Outputs

```typescript
const expectedOutputs = {
  json: {
    level: 'info',
    message: 'Test message',
    timestamp: '2025-10-15T12:34:56.789Z',
    context: 'TestContext',
    service: 'backend',
    hostname: 'test-host',
    pid: 12345,
  },
  pretty: '[2025-10-15 12:34:56] INFO  TestContext    : Test message',
};
```

## Mock Setup

### Mock Console

```typescript
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

### Mock Environment Variables

```typescript
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});
```

## Validation Criteria

### Test Pass Criteria

✅ All tests pass
✅ Coverage > 95%
✅ No console errors during tests
✅ Tests run in < 5 seconds

### Quality Checks

✅ No skipped tests (except pending features)
✅ No test pollution (each test is independent)
✅ Clear test descriptions
✅ Proper setup/teardown

## Example Test Implementation

```typescript
import { loggingService } from '../loggingService';

describe('LoggingService', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    loggingService.setLogLevel('debug');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('should create logger with context', () => {
      const logger = loggingService.createLogger('TestContext');

      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
    });

    it('should log with correct context', () => {
      const logger = loggingService.createLogger('TestContext');
      logger.info('Test message');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('TestContext'));
    });
  });

  describe('log level filtering', () => {
    it('should log when level >= configured level', () => {
      loggingService.setLogLevel('info');
      const logger = loggingService.createLogger('Test');

      logger.info('Should appear');
      logger.warn('Should also appear');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should skip logs when level < configured level', () => {
      loggingService.setLogLevel('warn');
      const logger = loggingService.createLogger('Test');

      logger.debug('Should not appear');
      logger.info('Should not appear');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('setLogLevel', () => {
    it('should update log level dynamically', () => {
      loggingService.setLogLevel('error');
      expect(loggingService.getLogLevel()).toBe('error');

      loggingService.setLogLevel('debug');
      expect(loggingService.getLogLevel()).toBe('debug');
    });
  });
});
```

## Continuous Integration

### Pre-commit Checks

```bash
npm run test          # Run all tests
npm run test:coverage # Generate coverage report
```

### CI Pipeline

```yaml
# .github/workflows/test.yml
- name: Run Logging Module Tests
  run: npm test -- loggingService
```

## Manual Testing

### Smoke Test

```bash
# Start backend
cd apps/backend
npm run dev

# Test logging output
# Should see pretty formatted logs in development

# Set production mode
NODE_ENV=production LOG_FORMAT=json npm run dev
# Should see JSON formatted logs
```
