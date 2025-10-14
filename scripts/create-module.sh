#!/bin/bash

# Module Scaffolding Generator for ConnectiveByte
# Creates a new module following the established architecture patterns
# Usage: ./scripts/create-module.sh <module-name>

set -e

MODULE_NAME="$1"

if [ -z "$MODULE_NAME" ]; then
    echo "Usage: $0 <module-name>"
    echo "Example: $0 authentication"
    exit 1
fi

# Convert to PascalCase for class names
MODULE_CLASS=$(echo "$MODULE_NAME" | sed -r 's/(^|-)([a-z])/\U\2/g')

MODULE_PATH="apps/backend/src/modules/$MODULE_NAME"

echo "🚀 Creating new module: $MODULE_NAME"
echo "📁 Location: $MODULE_PATH"
echo "📝 Class name: ${MODULE_CLASS}Service"

# Check if module already exists
if [ -d "$MODULE_PATH" ]; then
    echo "❌ Error: Module $MODULE_NAME already exists at $MODULE_PATH"
    exit 1
fi

# Create directory structure
echo "📂 Creating directory structure..."
mkdir -p "$MODULE_PATH/.module"
mkdir -p "$MODULE_PATH/__tests__"

# Create .module documentation files
echo "📄 Creating .module documentation..."

# MODULE_GOALS.md
cat > "$MODULE_PATH/.module/MODULE_GOALS.md" << EOF
# ${MODULE_CLASS} Module - Goals

## Module Purpose

The ${MODULE_CLASS} module provides [description of primary functionality] for the ConnectiveByte backend application.

## Primary Objectives

1. **[Objective 1]**: [Description]
2. **[Objective 2]**: [Description]
3. **[Objective 3]**: [Description]

## Key Performance Indicators (KPIs)

- **Performance**: [Metric and target]
- **Reliability**: [Metric and target]
- **Scalability**: [Metric and target]

## Success Criteria

- [ ] Core functionality implemented
- [ ] Test coverage > 95%
- [ ] All integration tests passing
- [ ] Documentation complete
- [ ] Performance benchmarks met

## Business Value

- **[Value 1]**: [Description]
- **[Value 2]**: [Description]
- **[Value 3]**: [Description]
EOF

# ARCHITECTURE.md
cat > "$MODULE_PATH/.module/ARCHITECTURE.md" << EOF
# ${MODULE_CLASS} Module - Architecture

## Overview

This module follows the clean architecture pattern with clear layer separation.

## Layer Structure

### Controller Layer (HTTP/API)
- **${MODULE_CLASS}Controller**: Handles HTTP requests and responses
- Extends \`BaseController\` for consistent error handling
- Validates input and delegates to service layer

### Service Layer (Business Logic)
- **${MODULE_CLASS}Service**: Implements core business logic
- Extends \`BaseService\` for common functionality
- Independent of HTTP/transport concerns

### Domain Layer (Core Logic)
- Pure functions and domain models
- No external dependencies
- Highly testable

## Component Diagram

\`\`\`
┌─────────────────────────────────────┐
│   ${MODULE_CLASS}Controller          │
│   (BaseController)                  │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   ${MODULE_CLASS}Service             │
│   (BaseService)                     │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│   Domain Logic / Utilities          │
└─────────────────────────────────────┘
\`\`\`

## Dependencies

- \`BaseService\`: Common service functionality
- \`BaseController\`: HTTP request handling
- \`loggingService\`: Structured logging
- [Add other dependencies]

## Extension Points

- [Method/interface for extensibility]
- [Registration patterns if applicable]

## Data Flow

1. HTTP Request → Controller
2. Controller validates input
3. Controller calls Service method
4. Service executes business logic
5. Service returns result
6. Controller formats and sends response
EOF

# MODULE_STRUCTURE.md
cat > "$MODULE_PATH/.module/MODULE_STRUCTURE.md" << EOF
# ${MODULE_CLASS} Module - Structure

## Directory Layout

\`\`\`
apps/backend/src/modules/$MODULE_NAME/
├── .module/                      # Module documentation
│   ├── MODULE_GOALS.md          # Purpose and KPIs
│   ├── ARCHITECTURE.md          # Design and layers
│   ├── MODULE_STRUCTURE.md      # This file
│   ├── BEHAVIOR.md              # Expected behavior
│   ├── IMPLEMENTATION.md        # Implementation specs
│   ├── TEST.md                  # Test specifications
│   ├── TASKS.md                 # Development tasks
│   └── FEEDBACK.md              # Implementation log
├── __tests__/                   # Unit tests
│   ├── ${MODULE_NAME}Service.test.ts
│   └── ${MODULE_NAME}Controller.test.ts
├── ${MODULE_NAME}Service.ts      # Service implementation
├── ${MODULE_NAME}Controller.ts   # Controller implementation
├── types.ts                     # Type definitions
└── README.md                    # Usage documentation
\`\`\`

## File Descriptions

### Core Implementation

- **${MODULE_NAME}Service.ts**: Business logic implementation extending BaseService
- **${MODULE_NAME}Controller.ts**: HTTP request handling extending BaseController
- **types.ts**: TypeScript interfaces and types specific to this module

### Documentation

- **.module/**: Complete module documentation suite
- **README.md**: Developer-facing usage guide with examples

### Testing

- **__tests__/**: Unit tests for all components
- Target: > 95% test coverage
EOF

# BEHAVIOR.md
cat > "$MODULE_PATH/.module/BEHAVIOR.md" << EOF
# ${MODULE_CLASS} Module - Expected Behavior

## Input

### API Endpoints

- \`GET /api/$MODULE_NAME\`: [Description]
- \`POST /api/$MODULE_NAME\`: [Description]
- [Add other endpoints]

### Request Format

\`\`\`typescript
interface ${MODULE_CLASS}Request {
  // Define request structure
}
\`\`\`

## Processing Flow

1. **Validation**: Validate input parameters
2. **Authorization**: Check user permissions (if applicable)
3. **Processing**: Execute core functionality
4. **Response**: Format and return result

## Output

### Success Response

\`\`\`json
{
  "status": "success",
  "data": {
    // Response data structure
  },
  "timestamp": "2025-10-15T00:00:00.000Z"
}
\`\`\`

### Error Response

\`\`\`json
{
  "status": "error",
  "message": "Error description",
  "timestamp": "2025-10-15T00:00:00.000Z"
}
\`\`\`

## Error Handling

### Expected Errors

- **ValidationError (400)**: Invalid input parameters
- **UnauthorizedError (401)**: Authentication required
- **ForbiddenError (403)**: Insufficient permissions
- **NotFoundError (404)**: Resource not found
- **ServerError (500)**: Internal server error

### Error Recovery

- Graceful degradation on non-critical failures
- Automatic retry for transient errors (if applicable)
- Detailed error logging for debugging

## Edge Cases

- [ ] Empty input handling
- [ ] Invalid data formats
- [ ] Concurrent request handling
- [ ] Resource exhaustion scenarios
- [ ] Network failure handling
EOF

# IMPLEMENTATION.md
cat > "$MODULE_PATH/.module/IMPLEMENTATION.md" << EOF
# ${MODULE_CLASS} Module - Implementation Specification

## Service Implementation

### ${MODULE_CLASS}Service

\`\`\`typescript
import { BaseService } from '../../common/base/BaseService';
import { loggingService } from '../../services/loggingService';

export class ${MODULE_CLASS}Service extends BaseService {
  constructor() {
    super('${MODULE_CLASS}Service', loggingService.createLogger('${MODULE_CLASS}Service'));
  }

  // Core methods
  async performOperation(): Promise<Result> {
    return this.executeOperation(async () => {
      // Implementation
    }, 'performOperation');
  }
}
\`\`\`

### Key Methods

- \`performOperation()\`: [Description]
- [Add other methods]

## Controller Implementation

### ${MODULE_CLASS}Controller

\`\`\`typescript
import { BaseController } from '../../common/base/BaseController';
import { ${MODULE_CLASS}Service } from './${MODULE_NAME}Service';
import { loggingService } from '../../services/loggingService';

export class ${MODULE_CLASS}Controller extends BaseController {
  constructor(private service: ${MODULE_CLASS}Service) {
    super('${MODULE_CLASS}Controller', loggingService.createLogger('${MODULE_CLASS}Controller'));
  }

  handleRequest = async (req: Request, res: Response) => {
    await this.executeAction(req, res, async (req, res) => {
      const result = await this.service.performOperation();
      this.sendSuccess(res, result);
    });
  };
}
\`\`\`

## Type Definitions

\`\`\`typescript
// types.ts
export interface ${MODULE_CLASS}Config {
  // Configuration options
}

export interface ${MODULE_CLASS}Result {
  // Result structure
}
\`\`\`

## Dependencies

- BaseService: Core service functionality
- BaseController: HTTP request handling
- loggingService: Structured logging

## Integration Points

- Routes: \`apps/backend/src/routes/${MODULE_NAME}Routes.ts\`
- Services: Registered in main service container
- Middleware: [List any required middleware]
EOF

# TEST.md
cat > "$MODULE_PATH/.module/TEST.md" << EOF
# ${MODULE_CLASS} Module - Test Specification

## Test Coverage Goals

- Overall coverage: > 95%
- Service coverage: > 95%
- Controller coverage: 100%
- All edge cases covered

## Unit Tests - ${MODULE_CLASS}Service

### Happy Path Tests
- [ ] Test: Service initializes correctly
- [ ] Test: Core operation succeeds with valid input
- [ ] Test: Result format matches specification

### Edge Case Tests
- [ ] Test: Handles empty input
- [ ] Test: Handles invalid data
- [ ] Test: Handles concurrent requests
- [ ] Test: Recovers from transient errors

### Error Handling Tests
- [ ] Test: Throws appropriate error on invalid input
- [ ] Test: Logs errors correctly
- [ ] Test: Maintains service state after errors

## Unit Tests - ${MODULE_CLASS}Controller

### Request Handling Tests
- [ ] Test: Returns 200 on successful operation
- [ ] Test: Returns appropriate error code on failure
- [ ] Test: Validates input parameters
- [ ] Test: Formats response correctly

### Integration Tests
- [ ] Test: Controller → Service integration
- [ ] Test: Error handling end-to-end
- [ ] Test: Logging integration

## Performance Tests

- [ ] Response time < [target]ms
- [ ] Memory usage < [target]MB
- [ ] Concurrent request handling

## Test Utilities

\`\`\`typescript
// Test helpers
const createMockService = () => {
  // Mock implementation
};

const createMockRequest = (data: any) => {
  // Mock request
};
\`\`\`

## Coverage Validation

Run tests with coverage:
\`\`\`bash
npm test -- --coverage apps/backend/src/modules/$MODULE_NAME
\`\`\`

Target: > 95% coverage for all files
EOF

# TASKS.md
cat > "$MODULE_PATH/.module/TASKS.md" << EOF
# ${MODULE_CLASS} Module - Development Tasks

## Current Status: 🚧 IN PROGRESS

**Last Updated:** $(date +%Y-%m-%d)

## Phase 1: Documentation ✓ COMPLETED

- [x] Create MODULE_GOALS.md
- [x] Create ARCHITECTURE.md
- [x] Create MODULE_STRUCTURE.md
- [x] Create BEHAVIOR.md
- [x] Create IMPLEMENTATION.md
- [x] Create TEST.md
- [x] Create TASKS.md (this file)
- [x] Create FEEDBACK.md

**Result:** Complete .module documentation suite established

## Phase 2: Core Implementation ⏳ PENDING

### Service Implementation
- [ ] Create ${MODULE_NAME}Service.ts extending BaseService
- [ ] Implement core methods
- [ ] Add input validation
- [ ] Add error handling
- [ ] Export service instance

### Controller Implementation
- [ ] Create ${MODULE_NAME}Controller.ts extending BaseController
- [ ] Implement request handlers
- [ ] Add input validation
- [ ] Add error responses

### Type Definitions
- [ ] Create types.ts with interfaces
- [ ] Define request/response types
- [ ] Define configuration types

## Phase 3: Testing ⏳ PENDING

### Unit Tests - Service
- [ ] Test: Service initialization
- [ ] Test: Core functionality
- [ ] Test: Error handling
- [ ] Test: Edge cases

### Unit Tests - Controller
- [ ] Test: Request handling
- [ ] Test: Error responses
- [ ] Test: Input validation

### Integration Tests
- [ ] Test: Controller → Service integration
- [ ] Test: End-to-end functionality

### Coverage Validation
- [ ] Run tests with coverage report
- [ ] Verify coverage > 95%

## Phase 4: Integration ⏳ PENDING

- [ ] Create routes in routes/${MODULE_NAME}Routes.ts
- [ ] Register routes in main router
- [ ] Add middleware if needed
- [ ] Update app.ts

## Phase 5: Documentation ⏳ PENDING

- [ ] Create README.md with usage examples
- [ ] Document API endpoints
- [ ] Add integration guide
- [ ] Update main documentation

## Blockers

None currently.

## Next Steps

1. Implement ${MODULE_NAME}Service.ts
2. Implement ${MODULE_NAME}Controller.ts
3. Write comprehensive tests
4. Integrate with routing system
EOF

# FEEDBACK.md
cat > "$MODULE_PATH/.module/FEEDBACK.md" << EOF
# ${MODULE_CLASS} Module - Implementation Feedback

## Implementation Log

### $(date +%Y-%m-%d) - Module Scaffolding Created

**Status:** 🚧 Initial scaffolding generated

**Created:**
- Complete .module documentation suite (8 files)
- Directory structure following established patterns
- Documentation templates based on health/logging modules

**Next Steps:**
1. Review and customize MODULE_GOALS.md
2. Design detailed architecture in ARCHITECTURE.md
3. Implement ${MODULE_NAME}Service.ts
4. Implement ${MODULE_NAME}Controller.ts
5. Write comprehensive tests

**Notes:**
- Following patterns from health and logging modules
- Using BaseService and BaseController for consistency
- Targeting > 95% test coverage
- Aiming for production-ready quality

---

## Future Feedback

Document implementation progress, challenges, and learnings here as development proceeds.

### Implementation Challenges

(To be filled during development)

### Design Decisions

(To be filled during development)

### Lessons Learned

(To be filled during development)

### Performance Notes

(To be filled during development)
EOF

# Create README.md
cat > "$MODULE_PATH/README.md" << EOF
# ${MODULE_CLASS} Module

## Overview

[Brief description of the module's purpose and functionality]

## Features

- [Feature 1]
- [Feature 2]
- [Feature 3]

## Installation

This module is part of the ConnectiveByte backend monorepo.

## Usage

### Basic Usage

\`\`\`typescript
import { ${MODULE_NAME}Service } from './modules/$MODULE_NAME/${MODULE_NAME}Service';

const service = new ${MODULE_NAME}Service();
const result = await service.performOperation();
\`\`\`

### API Endpoints

\`\`\`
GET  /api/$MODULE_NAME    - [Description]
POST /api/$MODULE_NAME    - [Description]
\`\`\`

### Example Request

\`\`\`bash
curl http://localhost:3001/api/$MODULE_NAME
\`\`\`

### Example Response

\`\`\`json
{
  "status": "success",
  "data": {
    // Response data
  },
  "timestamp": "2025-10-15T00:00:00.000Z"
}
\`\`\`

## Configuration

[Configuration options if applicable]

## Testing

\`\`\`bash
# Run tests
npm test apps/backend/src/modules/$MODULE_NAME

# Run with coverage
npm test -- --coverage apps/backend/src/modules/$MODULE_NAME
\`\`\`

## Architecture

This module follows clean architecture principles:

- **Controller Layer**: HTTP request handling
- **Service Layer**: Business logic
- **Domain Layer**: Core functionality

See [ARCHITECTURE.md](.module/ARCHITECTURE.md) for detailed design.

## Development

### Adding New Features

1. Update .module/MODULE_GOALS.md with new objectives
2. Design changes in .module/ARCHITECTURE.md
3. Implement in service/controller
4. Add tests (maintain > 95% coverage)
5. Update documentation

### Code Quality

- Extends \`BaseService\` and \`BaseController\`
- Uses \`loggingService\` for structured logging
- Comprehensive error handling
- Input validation
- > 95% test coverage

## Contributing

Follow the established patterns in the health and logging modules for consistency.

## License

[License information]
EOF

echo "✅ Module scaffolding created successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Review and customize .module/MODULE_GOALS.md"
echo "2. Design your architecture in .module/ARCHITECTURE.md"
echo "3. Implement ${MODULE_NAME}Service.ts"
echo "4. Implement ${MODULE_NAME}Controller.ts"
echo "5. Write tests in __tests__/"
echo ""
echo "📚 Reference implementations:"
echo "- Health module: apps/backend/src/modules/health"
echo "- Logging module: apps/backend/src/modules/logging"
echo ""
echo "🎯 Quality targets:"
echo "- Test coverage: > 95%"
echo "- Zero anti-patterns"
echo "- Full .module compliance"
echo ""
echo "Happy coding! 🚀"
