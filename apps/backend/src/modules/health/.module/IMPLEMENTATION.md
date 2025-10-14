# Health Check Module - Implementation Details

## Class Hierarchy

```
BaseService (common/base/BaseService.ts)
    ↓ extends
HealthService (services/healthService.ts)

BaseController (common/base/BaseController.ts)
    ↓ extends
HealthController (controllers/healthController.ts)
```

## Core Classes

### HealthService

**Location:** `apps/backend/src/services/healthService.ts`

**Class Definition:**
```typescript
class HealthService extends BaseService {
  private healthChecks: Map<string, HealthCheckFunction>

  constructor()
  registerCheck(name: string, checkFn: HealthCheckFunction): void
  unregisterCheck(name: string): void
  getHealthStatus(): Promise<ServiceResult<HealthStatus>>
  isHealthy(): Promise<boolean>

  private registerDefaultChecks(): void
  private checkUptime(): Promise<HealthCheck>
  private checkMemory(): Promise<HealthCheck>
}
```

**Dependencies:**
```typescript
import { BaseService } from '../common/base/BaseService';
import { HealthStatus, HealthCheck, ServiceResult } from '../common/types';
```

**Key Methods:**

#### `registerCheck(name, checkFn)`
- **Purpose:** Register a new health check function
- **Parameters:**
  - `name: string` - Unique identifier for the check
  - `checkFn: HealthCheckFunction` - Async function returning HealthCheck
- **Behavior:** Adds check to internal Map, logs registration
- **Thread Safety:** Map operations are atomic

#### `getHealthStatus()`
- **Purpose:** Execute all checks and return aggregated status
- **Returns:** `Promise<ServiceResult<HealthStatus>>`
- **Algorithm:**
  1. Get all registered check functions from Map
  2. Create array of promises (one per check)
  3. Execute all promises in parallel with `Promise.all()`
  4. Measure response time for each check
  5. Catch individual check errors without failing
  6. Aggregate results into overall status
  7. Return wrapped in ServiceResult

#### `isHealthy()`
- **Purpose:** Simple boolean health check
- **Returns:** `Promise<boolean>`
- **Implementation:** Calls `getHealthStatus()` and checks if status is 'ok'

### HealthController

**Location:** `apps/backend/src/controllers/healthController.ts`

**Class Definition:**
```typescript
class HealthController extends BaseController {
  constructor()

  async handleHealthCheck(req: Request, res: Response): Promise<void>
  handleRoot(req: Request, res: Response): void
}
```

**Dependencies:**
```typescript
import { Request, Response } from 'express';
import { BaseController } from '../common/base/BaseController';
import { healthService } from '../services/healthService';
```

**Key Methods:**

#### `handleHealthCheck(req, res)`
- **Purpose:** Handle GET /api/health requests
- **Parameters:** Express Request and Response objects
- **Returns:** Promise<void>
- **Algorithm:**
  1. Call `this.executeAction()` (from BaseController)
  2. Call `healthService.getHealthStatus()`
  3. Check if result is successful
  4. If not successful, send 503 error
  5. If status is 'error', send data with 503
  6. If status is 'ok', send data with 200
- **Error Handling:** Automatic via BaseController.executeAction()

#### `handleRoot(req, res)`
- **Purpose:** Handle GET / requests
- **Returns:** void
- **Implementation:** Sends welcome message with API information

## Type Definitions

**Location:** `apps/backend/src/common/types/index.ts`

```typescript
export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  checks?: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'ok' | 'error';
  message?: string;
  responseTime?: number;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  metadata?: Record<string, unknown>;
}

export type HealthCheckFunction = () => Promise<HealthCheck>;
```

## Base Classes Implementation

### BaseService

**Key Features:**
- `executeOperation<T>()`: Wraps async operations with try-catch
- Automatic logging (start, success, error)
- Performance tracking (duration measurement)
- Standardized error handling
- Result wrapping in ServiceResult

**Usage Pattern:**
```typescript
async myMethod() {
  return this.executeOperation(async () => {
    // Your logic here
    return data;
  }, 'operationName');
}
```

### BaseController

**Key Features:**
- `sendSuccess<T>()`: Standardized success response
- `sendError()`: Standardized error response
- `executeAction()`: Automatic error handling for controller methods
- HTTP status code mapping
- Consistent JSON formatting

**Usage Pattern:**
```typescript
async handleRequest(req: Request, res: Response) {
  await this.executeAction(req, res, async (req, res) => {
    const data = await service.getData();
    this.sendSuccess(res, data);
  });
}
```

## Configuration

**No external configuration required** - Health checks are self-contained.

Optional environment variables:
- `NODE_ENV`: Affects error message verbosity (production hides details)
- `PORT`: Server port (default: 3001)

## Dependencies

### Internal Dependencies
- `common/base/BaseService.ts`
- `common/base/BaseController.ts`
- `common/types/index.ts`

### External Dependencies (from package.json)
- `express`: ^4.x.x - HTTP framework
- `@types/express`: Type definitions

## Singleton Pattern

Both service and controller export singleton instances:

```typescript
// In healthService.ts
export const healthService = new HealthService();

// In healthController.ts
const healthController = new HealthController();
export const handleHealthCheck = healthController.handleHealthCheck.bind(healthController);
```

**Rationale:**
- Single shared state for registered health checks
- Prevents multiple instances from conflicting
- Simplifies dependency injection
- Maintains backwards compatibility with function exports

## Extension Example

### Adding a Database Health Check

```typescript
// In database initialization file
import { healthService } from '../services/healthService';
import { HealthCheck } from '../common/types';

async function checkDatabase(): Promise<HealthCheck> {
  try {
    await database.ping();
    return {
      name: 'database',
      status: 'ok',
      message: 'Database connection healthy'
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'error',
      message: error instanceof Error ? error.message : 'Database unreachable'
    };
  }
}

// Register the check
healthService.registerCheck('database', checkDatabase);
```

### Adding a Custom Service

```typescript
import { BaseService } from '../common/base/BaseService';
import { ServiceResult } from '../common/types';

class MyCustomService extends BaseService {
  constructor() {
    super('MyCustomService');
  }

  async processData(input: string): Promise<ServiceResult<string>> {
    return this.executeOperation(async () => {
      // Validation
      if (!input) {
        throw new Error('Input required');
      }

      // Processing
      const result = input.toUpperCase();

      return result;
    }, 'processData');
  }
}

export const myCustomService = new MyCustomService();
```

## Code Quality Standards

### Type Safety
- All public methods have explicit type annotations
- Interfaces defined in common/types
- No use of `any` type (except in error handling where necessary)

### Error Handling
- All async operations wrapped in try-catch via BaseService
- Errors logged with context
- Errors never crash the application
- Production mode hides sensitive error details

### Logging
- All operations logged with appropriate level
- Context included (service name, operation name)
- Performance metrics tracked (duration)

### Testing
- Service logic testable independently of HTTP
- Controller testable with mock service
- Individual health checks testable in isolation
