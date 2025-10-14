# Quick Reference - ConnectiveByte Backend Module Development

## Creating a New Module

```bash
# 1. Generate module scaffolding
./scripts/create-module.sh my-module

# 2. Customize .module documentation
cd apps/backend/src/modules/my-module/.module
# Edit MODULE_GOALS.md, ARCHITECTURE.md, etc.

# 3. Implement service
# apps/backend/src/modules/my-module/myModuleService.ts
```

```typescript
import { BaseService } from '../../common/base/BaseService';
import { loggingService } from '../../services/loggingService';

export class MyModuleService extends BaseService {
  constructor() {
    super('MyModuleService', loggingService.createLogger('MyModuleService'));
  }

  async performOperation() {
    return this.executeOperation(async () => {
      // Your logic here
    }, 'performOperation');
  }
}
```

```bash
# 4. Write tests
# apps/backend/src/modules/my-module/__tests__/myModuleService.test.ts

# 5. Check compliance
./scripts/check-module-compliance.sh my-module

# 6. Run tests
npm test apps/backend/src/modules/my-module
```

## Key Patterns

### Service Pattern
```typescript
class MyService extends BaseService {
  constructor() {
    super('MyService', loggingService.createLogger('MyService'));
  }

  async operation() {
    return this.executeOperation(async () => {
      // Logic
    }, 'operation');
  }
}
```

### Controller Pattern
```typescript
class MyController extends BaseController {
  constructor(private service: MyService) {
    super('MyController', loggingService.createLogger('MyController'));
  }

  handleRequest = async (req: Request, res: Response) => {
    await this.executeAction(req, res, async (req, res) => {
      const result = await this.service.operation();
      this.sendSuccess(res, result);
    });
  };
}
```

### Extension Pattern
```typescript
class ExtensibleService extends BaseService {
  private plugins = new Map<string, Plugin>();

  registerPlugin(name: string, plugin: Plugin) {
    this.plugins.set(name, plugin);
  }
}
```

## Quality Checklist

- [ ] Extends BaseService or BaseController
- [ ] Uses loggingService.createLogger()
- [ ] .module documentation complete (8/8 files)
- [ ] Tests > 95% coverage
- [ ] No anti-patterns (console.log, manual try-catch)
- [ ] README.md with usage examples

## Common Commands

```bash
# Create module
./scripts/create-module.sh <name>

# Check compliance
./scripts/check-module-compliance.sh <name>

# Run tests
npm test apps/backend/src/modules/<name>

# Run with coverage
npm test -- --coverage apps/backend/src/modules/<name>

# Lint
npm run lint

# Type check
npm run type-check
```

## Reference Modules

**Health Module**: `apps/backend/src/modules/health`
- Controller → Service pattern
- Registration pattern (health checks)
- Parallel execution

**Logging Module**: `apps/backend/src/modules/logging`
- Strategy pattern (formatters)
- Multiple transports
- File rotation

## Documentation

- **MODULE_REFACTORING_REPORT.md** - Detailed analysis
- **BEST_PRACTICES.md** - Development guidelines
- **MODULE_REFACTORING_SUMMARY.md** - Executive summary
- **QUICK_REFERENCE.md** - This document

## Quality Standards

| Metric | Target | Check |
|--------|--------|-------|
| Test Coverage | > 95% | npm test -- --coverage |
| .module Docs | 8/8 files | ls .module/ |
| Base Classes | Required | grep "extends Base" |
| Anti-patterns | 0 | ./scripts/check-module-compliance.sh |

## Anti-Patterns to Avoid

```typescript
// ❌ WRONG
console.log('message');
try { } catch { }
res.json(data);

// ✅ CORRECT
this.logger.info('message');
this.executeOperation(async () => { });
this.sendSuccess(res, data);
```

## Getting Help

1. Check existing modules: health, logging
2. Read BEST_PRACTICES.md
3. Use compliance checker for guidance
4. All modules follow same patterns

---

**Quick Start:** `./scripts/create-module.sh my-module`
