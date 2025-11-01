# ConnectiveByte Backend - Best Practices & Patterns

## Overview

This document captures the best practices, architectural patterns, and design decisions that have proven successful in the ConnectiveByte backend. Use this as a guide when developing new modules or refactoring existing code.

## Architecture Principles

### 1. Clean Architecture

Follow the clean architecture pattern with clear layer separation:

```
┌─────────────────────────────────────┐
│   Controller Layer (HTTP/API)       │  ← Handles requests/responses
├─────────────────────────────────────┤
│   Service Layer (Business Logic)    │  ← Core functionality
├─────────────────────────────────────┤
│   Domain Layer (Pure Functions)     │  ← Independent logic
└─────────────────────────────────────┘
```

**Benefits:**

- Each layer has a single responsibility
- Business logic is independent of HTTP concerns
- Easy to test each layer in isolation
- Changes in one layer don't affect others

### 2. Base Class Inheritance

Always extend the appropriate base class:

**For Services:**

```typescript
import { BaseService } from '../../common/base/BaseService';
import { loggingService } from '../../services/loggingService';

export class MyService extends BaseService {
  constructor() {
    super('MyService', loggingService.createLogger('MyService'));
  }

  async performOperation() {
    return this.executeOperation(async () => {
      // Your business logic here
    }, 'performOperation');
  }
}
```

**For Controllers:**

```typescript
import { BaseController } from '../../common/base/BaseController';
import { loggingService } from '../../services/loggingService';

export class MyController extends BaseController {
  constructor(private service: MyService) {
    super('MyController', loggingService.createLogger('MyController'));
  }

  handleRequest = async (req: Request, res: Response) => {
    await this.executeAction(req, res, async (req, res) => {
      const result = await this.service.performOperation();
      this.sendSuccess(res, result);
    });
  };
}
```

**Benefits:**

- Consistent error handling across all modules
- Structured logging by default
- Automatic response formatting
- Reduces boilerplate code
- Standardized patterns

### 3. Dependency Injection for Logger

**Correct Pattern:**

```typescript
class HealthService extends BaseService {
  constructor() {
    // Explicit logger injection prevents circular dependencies
    super('HealthService', loggingService.createLogger('HealthService'));
  }
}
```

**Why this works:**

- Avoids circular import between loggingService and BaseService
- Maintains testability (can inject mock logger)
- Allows per-module logger configuration
- Each service/controller has its own logger context

**Anti-pattern (Don't do this):**

```typescript
// ❌ WRONG: Creates circular dependency
class BaseService {
  constructor(serviceName: string) {
    this.logger = loggingService.createLogger(serviceName); // Circular!
  }
}
```

## Module Structure

### Standard Directory Layout

```
apps/backend/src/modules/[module-name]/
├── .module/                      # Complete documentation
│   ├── MODULE_GOALS.md          # Purpose, KPIs, success criteria
│   ├── ARCHITECTURE.md          # Layer design, components
│   ├── MODULE_STRUCTURE.md      # Directory layout
│   ├── BEHAVIOR.md              # Expected behavior, I/O specs
│   ├── IMPLEMENTATION.md        # Code specifications
│   ├── TEST.md                  # Test requirements
│   ├── TASKS.md                 # Development progress
│   └── FEEDBACK.md              # Implementation learnings
├── [components]/                 # Module-specific components
│   ├── formatters/              # (example from logging)
│   └── transports/              # (example from logging)
├── __tests__/                   # Unit tests
│   ├── [module]Service.test.ts
│   └── [module]Controller.test.ts
├── [module]Service.ts           # Service implementation
├── [module]Controller.ts        # Controller implementation (optional)
├── types.ts                     # TypeScript types/interfaces
└── README.md                    # Usage documentation
```

### .module Documentation Suite

**Always create complete .module documentation BEFORE coding:**

1. **MODULE_GOALS.md**: Define what success looks like
   - Primary objectives
   - KPIs with measurable targets
   - Success criteria (checkboxes)
   - Business value

2. **ARCHITECTURE.md**: Design the structure
   - Layer diagram
   - Component relationships
   - Dependencies
   - Extension points

3. **BEHAVIOR.md**: Specify expected behavior
   - Input formats
   - Processing flow
   - Output formats
   - Error handling
   - Edge cases

4. **IMPLEMENTATION.md**: Detail the code
   - Class structures
   - Method signatures
   - Type definitions
   - Integration points

5. **TEST.md**: Plan the tests
   - Test cases (happy path, edge cases, errors)
   - Coverage targets (> 95%)
   - Performance benchmarks

6. **TASKS.md**: Track progress
   - Phased development plan
   - Checkboxes for each task
   - Blockers and dependencies

7. **FEEDBACK.md**: Record learnings
   - Implementation notes
   - Design decisions
   - Challenges encountered
   - Solutions applied

## Code Quality Standards

### Testing Requirements

**Minimum Coverage: 95%**

```typescript
// Example test structure
describe('MyService', () => {
  describe('Happy Path', () => {
    it('should perform operation successfully', async () => {
      const service = new MyService();
      const result = await service.performOperation();
      expect(result.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', async () => {
      // Test edge case
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // Test error scenario
    });
  });
});
```

**Coverage Targets:**

- Services: > 95%
- Controllers: 100%
- Utilities: 100%

### Error Handling

**Use Base Class Methods:**

```typescript
// ✅ CORRECT: Use executeOperation
async performOperation() {
  return this.executeOperation(async () => {
    // Business logic
    // Errors are automatically caught and logged
  }, 'performOperation');
}

// ❌ WRONG: Manual try-catch
async performOperation() {
  try {
    // Business logic
  } catch (error) {
    console.error(error); // Manual logging
    throw error;
  }
}
```

### Logging

**Use Structured Logging:**

```typescript
// ✅ CORRECT: Use loggingService
this.logger.info('Operation completed', {
  duration: 123,
  recordsProcessed: 45,
  success: true,
});

// ❌ WRONG: Direct console.log
console.log('Operation completed:', duration);
```

**Log Levels:**

- `debug`: Development-only detailed information
- `info`: Normal operational messages
- `warn`: Warning conditions that should be reviewed
- `error`: Error conditions with full error objects

### Response Formatting

**Use Base Class Methods:**

```typescript
// ✅ CORRECT: Use sendSuccess/sendError
this.sendSuccess(res, { data: result }, 200);
this.sendError(res, 'Invalid input', 400);

// ❌ WRONG: Manual response formatting
res.status(200).json({ data: result });
res.status(400).json({ error: 'Invalid input' });
```

## Design Patterns

### 1. Registration Pattern for Extensibility

Allow users to extend functionality without modifying core code:

```typescript
export class ExtensibleService extends BaseService {
  private plugins = new Map<string, Plugin>();

  registerPlugin(name: string, plugin: Plugin): void {
    this.logger.info(`Registering plugin: ${name}`);
    this.plugins.set(name, plugin);
  }

  unregisterPlugin(name: string): void {
    this.plugins.delete(name);
  }

  protected getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }
}
```

**Examples:**

- Health module: `registerCheck()` / `unregisterCheck()`
- Logging module: `registerFormatter()` / `registerTransport()`

### 2. Strategy Pattern for Algorithms

Allow runtime selection of algorithms:

```typescript
interface Formatter {
  format(entry: LogEntry): string;
}

class JsonFormatter implements Formatter {
  format(entry: LogEntry): string {
    return JSON.stringify(entry);
  }
}

class PrettyFormatter implements Formatter {
  format(entry: LogEntry): string {
    return `[${entry.level}] ${entry.message}`;
  }
}

class LoggingService {
  private formatter: Formatter = new JsonFormatter();

  setFormatter(formatter: Formatter): void {
    this.formatter = formatter;
  }
}
```

### 3. Factory Pattern for Object Creation

Centralize object creation logic:

```typescript
class LoggerFactory {
  createLogger(context: string): Logger {
    return {
      info: (msg, meta) => this.log('info', context, msg, meta),
      error: (msg, err, meta) => this.log('error', context, msg, meta, err),
      // ...
    };
  }

  private log(level: string, context: string, message: string, meta?: any, error?: Error) {
    // Centralized logging logic
  }
}
```

## Performance Best Practices

### 1. Async Operations

Always use async/await for I/O operations:

```typescript
// ✅ CORRECT: Async file operations
async writeLog(entry: LogEntry): Promise<void> {
  await fs.promises.appendFile(this.logFile, JSON.stringify(entry));
}

// ❌ WRONG: Sync operations (blocks event loop)
writeLog(entry: LogEntry): void {
  fs.appendFileSync(this.logFile, JSON.stringify(entry));
}
```

### 2. Parallel Execution

Execute independent operations in parallel:

```typescript
// ✅ CORRECT: Parallel execution
const results = await Promise.all([
  this.checkDatabase(),
  this.checkExternalAPI(),
  this.checkMemory(),
]);

// ❌ WRONG: Sequential execution (slower)
const dbResult = await this.checkDatabase();
const apiResult = await this.checkExternalAPI();
const memResult = await this.checkMemory();
```

### 3. Resource Cleanup

Always clean up resources:

```typescript
class FileTransport {
  async flush(): Promise<void> {
    // Process pending writes
    await Promise.all(this.writeQueue);
    this.writeQueue = [];
  }

  async close(): Promise<void> {
    await this.flush();
    // Close file handles
  }
}
```

## Security Best Practices

### 1. Input Validation

Always validate user input:

```typescript
protected validateInput(data: unknown): ValidationError[] | null {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    errors.push({ field: 'body', message: 'Invalid request body' });
  }

  return errors.length > 0 ? errors : null;
}
```

### 2. Error Messages

Don't leak sensitive information in error messages:

```typescript
// ✅ CORRECT: Generic error in production
const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : errorObj.message;

// ❌ WRONG: Detailed errors in production
const message = errorObj.message; // May leak stack traces, paths, etc.
```

### 3. Logging Sensitive Data

Never log sensitive information:

```typescript
// ✅ CORRECT: Redact sensitive fields
this.logger.info('User login', {
  userId: user.id,
  username: user.username,
  // Don't log: password, tokens, etc.
});

// ❌ WRONG: Logging sensitive data
this.logger.info('User login', { user }); // May include password!
```

## Development Workflow

### Creating a New Module

1. **Use the scaffolding tool:**

   ```bash
   ./scripts/create-module.sh my-module
   ```

2. **Customize .module documentation:**
   - Define goals and KPIs
   - Design architecture
   - Specify behavior and tests

3. **Implement following patterns:**
   - Extend BaseService/BaseController
   - Use dependency injection for logger
   - Follow established directory structure

4. **Write tests FIRST:**
   - Define test cases from TEST.md
   - Aim for > 95% coverage
   - Test happy path, edge cases, errors

5. **Validate compliance:**

   ```bash
   ./scripts/check-module-compliance.sh my-module
   ```

6. **Iterate until 95%+ compliance**

### Refactoring Existing Code

1. **Analyze current state:**
   - Check .module compliance
   - Identify anti-patterns
   - Measure test coverage

2. **Create .module documentation:**
   - Document current behavior
   - Define desired architecture
   - Plan refactoring phases

3. **Refactor incrementally:**
   - Phase 1: Add .module docs
   - Phase 2: Extend base classes
   - Phase 3: Improve test coverage
   - Phase 4: Validate compliance

4. **Verify no regressions:**
   - All tests still pass
   - Performance not degraded
   - API compatibility maintained

## Tools and Scripts

### Module Scaffolding

```bash
# Create new module with complete structure
./scripts/create-module.sh authentication

# Output: Complete directory structure with .module docs
```

### Compliance Checking

```bash
# Check module compliance
./scripts/check-module-compliance.sh health

# Output: Detailed compliance report with score
```

### Testing

```bash
# Run tests with coverage
npm test -- --coverage apps/backend/src/modules/my-module

# Target: > 95% coverage
```

## Reference Implementations

### Health Module

**Perfect example of:**

- Clean architecture (Controller → Service pattern)
- Extensibility (registerCheck/unregisterCheck)
- Parallel execution (checks run concurrently)
- Complete .module documentation
- 100% test coverage on controller

**Location:** `apps/backend/src/modules/health`

### Logging Module

**Perfect example of:**

- Strategy pattern (formatters)
- Registration pattern (transports)
- Singleton service pattern
- Comprehensive test coverage (96-100%)
- Production-ready features (file rotation)

**Location:** `apps/backend/src/modules/logging`

## Common Pitfalls and Solutions

### Pitfall 1: Circular Dependencies

**Problem:**

```typescript
// BaseService tries to import loggingService
import { loggingService } from '../../services/loggingService';
```

**Solution:**

```typescript
// Use dependency injection instead
constructor(serviceName: string, logger?: Logger) {
  this.logger = logger || this.createDefaultLogger();
}
```

### Pitfall 2: Insufficient Test Coverage

**Problem:**

- Only testing happy path
- Ignoring edge cases
- Not testing error handling

**Solution:**

```typescript
describe('MyService', () => {
  describe('Happy Path', () => {
    /* ... */
  });
  describe('Edge Cases', () => {
    /* ... */
  });
  describe('Error Handling', () => {
    /* ... */
  });
});
```

### Pitfall 3: Tight Coupling

**Problem:**

```typescript
// Service directly depends on specific implementation
class MyService {
  private formatter = new JsonFormatter(); // Tight coupling
}
```

**Solution:**

```typescript
// Use dependency injection or registration pattern
class MyService {
  private formatter: Formatter;

  setFormatter(formatter: Formatter): void {
    this.formatter = formatter;
  }
}
```

## Conclusion

Following these best practices ensures:

✅ **Consistency:** All modules follow the same patterns
✅ **Quality:** High test coverage and clean code
✅ **Maintainability:** Easy to understand and modify
✅ **Extensibility:** New features can be added easily
✅ **Production-Ready:** Meets enterprise standards

**Remember:** When in doubt, refer to the health and logging modules as reference implementations.

---

**Last Updated:** 2025-10-15
**Maintained By:** ConnectiveByte Backend Team
