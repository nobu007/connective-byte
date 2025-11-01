# Health Check Module - Architecture

## Architectural Overview

The Health Check module follows clean architecture principles with clear separation of concerns across three layers.

## Layer Structure

```
┌─────────────────────────────────────────────┐
│         Controller Layer (HTTP)              │
│  HealthController extends BaseController     │
│  - Request handling                          │
│  - Response formatting                       │
│  - HTTP status code mapping                  │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│         Service Layer (Business Logic)       │
│  HealthService extends BaseService           │
│  - Health check orchestration                │
│  - Check registration/management             │
│  - Parallel execution of checks              │
│  - Status aggregation                        │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│         Check Functions (Domain)             │
│  - checkUptime()                             │
│  - checkMemory()                             │
│  - checkDatabase() [planned]                 │
│  - checkExternalAPI() [planned]              │
└─────────────────────────────────────────────┘
```

## Component Diagram

### HealthService (Core Business Logic)

**Responsibilities:**

- Register and manage health check functions
- Execute all checks in parallel for performance
- Aggregate individual check results
- Determine overall health status
- Provide extensibility through check registration

**Dependencies:**

- BaseService (common/base)
- HealthStatus, HealthCheck types (common/types)

**Extension Points:**

- `registerCheck(name, fn)` - Add custom health checks
- `unregisterCheck(name)` - Remove health checks

### HealthController (HTTP Interface)

**Responsibilities:**

- Handle HTTP requests for health endpoint
- Format responses using BaseController
- Map health status to HTTP status codes (200 OK, 503 Service Unavailable)
- Handle errors gracefully

**Dependencies:**

- BaseController (common/base)
- HealthService (services)

### Base Infrastructure

**BaseService:**

- Provides `executeOperation()` for automatic error handling
- Built-in logging with context
- Performance tracking (duration)
- Standardized result wrapping

**BaseController:**

- Provides `executeAction()` for request handling
- Standardized success/error responses
- Automatic error-to-HTTP-status mapping
- Consistent JSON formatting

## Data Flow

```
1. HTTP Request → HealthController.handleHealthCheck()
2. Controller → HealthService.getHealthStatus()
3. Service → Execute all registered checks in parallel
4. Checks → Return individual HealthCheck results
5. Service → Aggregate results → Overall HealthStatus
6. Controller → Format ApiResponse<HealthStatus>
7. HTTP Response → JSON with health data
```

## Design Patterns

1. **Template Method Pattern**: BaseService/BaseController provide template for common operations
2. **Strategy Pattern**: Health checks are pluggable strategies
3. **Singleton Pattern**: Single shared instance of HealthService
4. **Facade Pattern**: HealthService provides simple interface to complex health checking

## Extension Points

### Adding a New Health Check

```typescript
// In any module
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

### Creating a Custom Service

```typescript
import { BaseService } from '../common/base/BaseService';

class MyService extends BaseService {
  constructor() {
    super('MyService');
  }

  async myOperation() {
    return this.executeOperation(async () => {
      // Your business logic here
      return result;
    }, 'myOperation');
  }
}
```

## Technology Stack

- **TypeScript**: Type safety and interfaces
- **Express.js**: HTTP routing
- **BaseService/BaseController**: Reusable abstractions
- **Async/Await**: Modern async handling
- **Parallel Execution**: Promise.all for performance

## Future Enhancements

1. **Health Check Caching**: Cache results for configurable duration
2. **Health Check Scheduling**: Run checks on intervals, not just on request
3. **Alert Integration**: Trigger alerts when health degrades
4. **Metrics Export**: Prometheus/OpenTelemetry integration
5. **Health Check Dependencies**: Mark critical vs non-critical checks
