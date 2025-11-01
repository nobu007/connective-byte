# Logging Module - Structure

## Directory Structure

```
apps/backend/src/modules/logging/
├── .module/                        # Module documentation
│   ├── MODULE_GOALS.md            # Purpose and objectives
│   ├── ARCHITECTURE.md            # Architecture design
│   ├── MODULE_STRUCTURE.md        # This file
│   ├── BEHAVIOR.md                # Expected behavior
│   ├── IMPLEMENTATION.md          # Implementation details
│   ├── TEST.md                    # Test specifications
│   ├── TASKS.md                   # Development tasks
│   └── FEEDBACK.md                # Implementation feedback
│
├── formatters/                     # Log formatters
│   ├── JsonFormatter.ts           # JSON formatter for production
│   ├── PrettyFormatter.ts         # Human-readable formatter
│   └── index.ts                   # Formatter exports
│
├── transports/                     # Log transports
│   ├── ConsoleTransport.ts        # Console output
│   ├── FileTransport.ts           # File output (optional)
│   └── index.ts                   # Transport exports
│
└── README.md                       # Module overview
```

## Integration Points

### Service Layer

- **Location**: `apps/backend/src/services/loggingService.ts`
- **Purpose**: Core logging business logic
- **Extends**: BaseService

### Controller Layer (Optional)

- **Location**: `apps/backend/src/controllers/loggingController.ts`
- **Purpose**: HTTP interface for log management
- **Extends**: BaseController

### Routes Layer (Optional)

- **Location**: `apps/backend/src/routes/loggingRoutes.ts`
- **Purpose**: API endpoints for logging
- **Routes**:
  - `GET /api/logging/config` - Get current configuration
  - `PUT /api/logging/config` - Update log level

### Types

- **Location**: `apps/backend/src/common/types/index.ts`
- **Purpose**: Logging interfaces and types
- **Exports**: Logger, LogLevel, LogEntry, LogFormatter, LogTransport

## File Naming Conventions

- **Services**: `loggingService.ts` (camelCase)
- **Controllers**: `loggingController.ts` (camelCase)
- **Routes**: `loggingRoutes.ts` (camelCase)
- **Types**: `index.ts` in types directory
- **Tests**: `__tests__/loggingService.test.ts`

## Import Pattern

```typescript
// From other modules
import { loggingService } from '../services/loggingService';

// Usage
const logger = loggingService.createLogger('ModuleName');
logger.info('Operation completed', { duration: 123 });
```

## Dependencies

### Internal

- `common/base/BaseService`
- `common/base/BaseController`
- `common/types/index`

### External

- None (uses built-in Node.js capabilities)

## Configuration Files

- **Environment**: `.env` (LOG_LEVEL, LOG_FORMAT)
- **TypeScript**: Inherits from root `tsconfig.json`
- **Jest**: Uses backend `jest.config.js`
