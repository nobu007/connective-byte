# Health Module - Structure

## Directory Structure

```
apps/backend/src/modules/health/
├── .module/                      # Module documentation and metadata
│   ├── ARCHITECTURE.md           # Architecture design and patterns
│   ├── BEHAVIOR.md              # Expected behavior and specifications
│   ├── FEEDBACK.md              # Quality logs and learning records
│   ├── IMPLEMENTATION.md        # Implementation details and class definitions
│   ├── MODULE_GOALS.md          # Goals, KPIs, and success criteria
│   ├── MODULE_STRUCTURE.md      # This file - directory structure
│   ├── TASKS.md                 # Current tasks and progress tracking
│   └── TEST.md                  # Test strategy and test cases
│
├── (Note: Implementation files are in parent directories following standard Express/Node structure)
```

## Implementation File Locations

Following the standard Express.js project structure, the health module's implementation files are organized in the main `apps/backend/src` directory:

```
apps/backend/src/
├── services/
│   └── healthService.ts         # Health check business logic
├── controllers/
│   └── healthController.ts      # HTTP request/response handling
├── routes/
│   └── healthRoutes.ts          # Express route definitions
├── common/
│   ├── base/
│   │   ├── BaseService.ts       # Base class for all services
│   │   └── BaseController.ts    # Base class for all controllers
│   └── types/
│       └── index.ts             # Type definitions (HealthStatus, HealthCheck, etc.)
└── __tests__/
    ├── healthService.test.ts    # Unit tests for HealthService
    ├── healthController.test.ts # Unit tests for HealthController
    └── api.test.ts              # Integration tests for health endpoints
```

## File Organization Rationale

### Why Implementation Files Are Not in `modules/health/`

The ConnectiveByte backend follows the **standard Express.js layered architecture**:

1. **Layer-based organization** (not feature-based)
   - All services go in `services/`
   - All controllers go in `controllers/`
   - All routes go in `routes/`

2. **Advantages:**
   - Consistent with Express.js conventions
   - Easy to find files by layer
   - Clear separation of concerns
   - Standard Node.js project structure

3. **The `.module/` directory serves a different purpose:**
   - Documentation and design specifications
   - Progress tracking and quality logs
   - Not for implementation code

### File Naming Convention

- **Service Layer:** `{feature}Service.ts` (e.g., `healthService.ts`)
- **Controller Layer:** `{feature}Controller.ts` (e.g., `healthController.ts`)
- **Routes:** `{feature}Routes.ts` (e.g., `healthRoutes.ts`)
- **Tests:** `{feature}Service.test.ts`, `{feature}Controller.test.ts`
- **Types:** Defined in `common/types/index.ts`

## Module Files Detailed

### 1. Service Layer (`services/healthService.ts`)

**Size:** ~162 lines
**Responsibilities:**

- Business logic for health checking
- Health check registration and management
- Parallel execution of checks
- Status aggregation

**Key Classes:**

- `HealthService extends BaseService`

**Key Methods:**

- `registerCheck(name, checkFn)` - Register health check
- `unregisterCheck(name)` - Remove health check
- `getHealthStatus()` - Execute all checks and return status
- `isHealthy()` - Simple boolean health check
- `checkUptime()` - Built-in uptime check
- `checkMemory()` - Built-in memory check

### 2. Controller Layer (`controllers/healthController.ts`)

**Size:** ~76 lines
**Responsibilities:**

- HTTP request/response handling
- Status code mapping (200, 503, 500)
- Response formatting using BaseController

**Key Classes:**

- `HealthController extends BaseController`

**Key Methods:**

- `handleHealthCheck(req, res)` - Handle GET /api/health
- `handleRoot(req, res)` - Handle GET /

### 3. Routes (`routes/healthRoutes.ts`)

**Size:** ~20 lines
**Responsibilities:**

- Express route definitions
- Route-to-controller mapping

**Routes Defined:**

- `GET /api/health` → `handleHealthCheck`
- `GET /` → `handleRoot`

### 4. Common Base Classes

#### BaseService (`common/base/BaseService.ts`)

**Size:** ~145 lines
**Provides:**

- `executeOperation<T>()` - Automatic error handling
- `executeSync<T>()` - Synchronous error handling
- Built-in logging with context
- Performance tracking (duration)
- Standardized result wrapping

#### BaseController (`common/base/BaseController.ts`)

**Size:** ~184 lines
**Provides:**

- `sendSuccess<T>()` - Standardized success response
- `sendError()` - Standardized error response
- `executeAction()` - Automatic error handling
- HTTP status code mapping
- Consistent JSON formatting

### 5. Type Definitions (`common/types/index.ts`)

**Defines:**

```typescript
interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  checks?: HealthCheck[];
}

interface HealthCheck {
  name: string;
  status: 'ok' | 'error';
  message?: string;
  responseTime?: number;
}

interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  metadata?: Record<string, unknown>;
}

interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  timestamp: string;
}

type HealthCheckFunction = () => Promise<HealthCheck>;
```

### 6. Test Files

#### Unit Tests (`__tests__/healthService.test.ts`)

**Size:** ~700+ lines
**Coverage:** 97.72%
**Test Count:** 26 tests
**Covers:**

- All service methods
- Parallel execution
- Error handling
- Edge cases
- Backwards compatibility

#### Unit Tests (`__tests__/healthController.test.ts`)

**Size:** ~500+ lines
**Coverage:** 100%
**Test Count:** 22 tests
**Covers:**

- HTTP status codes (200, 503, 500)
- Response formatting
- Error scenarios
- Integration with service

#### Integration Tests (`__tests__/api.test.ts`)

**Test Count:** 4 tests
**Covers:**

- End-to-end API testing
- Real HTTP requests
- Response structure validation

## Dependencies

### Internal Dependencies

```typescript
// Health module dependencies
healthController.ts → healthService.ts
healthService.ts → BaseService (common/base)
healthController.ts → BaseController (common/base)
Both → common/types

// No circular dependencies
```

### External Dependencies

From `package.json`:

```json
{
  "express": "^4.x.x",
  "@types/express": "^4.x.x",
  "jest": "^29.x.x",
  "supertest": "^6.x.x"
}
```

## Code Statistics

| File                | Lines | Classes | Methods | Test Coverage |
| ------------------- | ----- | ------- | ------- | ------------- |
| healthService.ts    | 162   | 1       | 6       | 97.72%        |
| healthController.ts | 76    | 1       | 2       | 100%          |
| BaseService.ts      | 145   | 1       | 4       | ~50% (shared) |
| BaseController.ts   | 184   | 1       | 6       | ~64% (shared) |

**Total Module Lines:** ~567 (including base classes)
**Total Tests:** 52
**Overall Coverage:** 97.72% (module-specific code)

## Module Extension Points

### Adding a New Health Check

```typescript
// In any initialization file
import { healthService } from '../services/healthService';

healthService.registerCheck('database', async () => {
  const connected = await checkDatabaseConnection();
  return {
    name: 'database',
    status: connected ? 'ok' : 'error',
    message: connected ? 'Connected' : 'Connection failed',
  };
});
```

### Adding a New Endpoint

```typescript
// In healthController.ts
public async handleCustom(req: Request, res: Response): Promise<void> {
  await this.executeAction(req, res, async (req, res) => {
    // Implementation
  });
}

// In healthRoutes.ts
router.get('/api/custom', handleCustom);
```

## Best Practices Followed

1. **Single Responsibility:** Each file has one clear purpose
2. **Dependency Injection:** Services injected via imports, not hard-coded
3. **Type Safety:** Full TypeScript with no `any` types
4. **Error Handling:** Automatic via base classes
5. **Testing:** Comprehensive unit and integration tests
6. **Documentation:** Complete .module documentation
7. **Extensibility:** Easy to add new health checks
8. **Performance:** Parallel execution of health checks

## Future Structure Considerations

If the module grows significantly, consider:

1. **Separate check functions:**

   ```
   services/
   └── health/
       ├── healthService.ts
       ├── checks/
       │   ├── uptimeCheck.ts
       │   ├── memoryCheck.ts
       │   └── databaseCheck.ts
       └── types.ts
   ```

2. **Multiple controller methods** (if health expands to multiple endpoints)

3. **Health check plugins** (dynamic loading)

For now, the current structure is optimal for the module's scope and complexity.
