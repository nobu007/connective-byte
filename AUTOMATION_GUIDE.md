# ConnectiveByte Automation Guide

## Overview

ConnectiveByte includes comprehensive automation tools to streamline development, ensure code quality, and maintain architectural standards.

## Table of Contents

1. [Development Scripts](#development-scripts)
2. [NPM Scripts](#npm-scripts)
3. [CI/CD Pipeline](#cicd-pipeline)
4. [Git Hooks](#git-hooks)
5. [Usage Examples](#usage-examples)

---

## Development Scripts

### 1. Module Scaffolding (`create-module.sh`)

**Purpose**: Automatically generates a new backend module with complete documentation and structure.

**Usage**:

```bash
./scripts/create-module.sh <module-name>
```

**Example**:

```bash
./scripts/create-module.sh authentication
```

**What it creates**:

- Complete `.module/` documentation suite (8 files):
  - `MODULE_GOALS.md` - Purpose, objectives, and KPIs
  - `ARCHITECTURE.md` - Design patterns and layer structure
  - `MODULE_STRUCTURE.md` - File organization
  - `BEHAVIOR.md` - Expected functionality and error handling
  - `IMPLEMENTATION.md` - Technical specifications
  - `TEST.md` - Test requirements and coverage goals
  - `TASKS.md` - Development task tracking
  - `FEEDBACK.md` - Implementation log
- `README.md` - Usage documentation
- `__tests__/` directory for unit tests
- Service and Controller templates extending base classes

**Benefits**:

- Ensures consistency across modules
- Follows clean architecture principles
- Reduces setup time
- Enforces documentation standards

### 2. Module Compliance Checker (`check-module-compliance.sh`)

**Purpose**: Validates that modules follow architectural standards and best practices.

**Usage**:

```bash
./scripts/check-module-compliance.sh <module-name>
```

**Example**:

```bash
./scripts/check-module-compliance.sh health
```

**What it checks**:

#### Documentation Compliance (8 files)

- ✅ Presence of all required `.module/` documentation files
- ✅ Content quality of MODULE_GOALS.md and ARCHITECTURE.md

#### Base Class Usage

- ✅ Services extend `BaseService`
- ✅ Controllers extend `BaseController`
- ✅ Uses `loggingService` for structured logging

#### Anti-pattern Detection

- ⚠️ Direct `console.log` usage (should use loggingService)
- ⚠️ Manual try-catch blocks (should use executeOperation/executeAction)
- ⚠️ Manual response formatting (should use sendSuccess/sendError)

#### File Structure

- ✅ README.md exists
- ✅ `__tests__/` directory with test files

#### Testing

- ✅ All tests passing
- ✅ Test coverage ≥ 95%

#### Output

- Compliance score (percentage)
- Grade: EXCELLENT (≥95%), GOOD (≥85%), FAIR (≥70%), NEEDS WORK (<70%)
- List of critical issues
- List of warnings
- Actionable recommendations

---

## NPM Scripts

### Development

```bash
# Start both frontend and backend in parallel
npm run dev

# Start frontend only
npm run dev:frontend

# Start backend only
npm run dev:backend
```

### Building

```bash
# Build both frontend and backend
npm run build

# Build for Netlify deployment
npm run build:netlify

# Preview production build
npm run preview
```

### Testing

```bash
# Run all tests (frontend + backend)
npm test

# Run frontend tests only
npm run test:frontend

# Run backend tests only
npm run test:backend

# Run E2E tests
npm run test:e2e
```

### Code Quality

```bash
# Lint all code
npm run lint

# Format all code with Prettier
npm run format

# Type check TypeScript
npm run type-check
```

---

## CI/CD Pipeline

### GitHub Actions (`.github/workflows/ci.yml`)

**Triggers**:

- Push to `main` branch
- Pull requests to `main` branch

**Jobs**:

1. **Setup**:
   - Checkout code
   - Setup Node.js 20.x
   - Cache npm dependencies

2. **Install**:
   - Install root dependencies
   - Install frontend dependencies
   - Install backend dependencies

3. **Test**:
   - Run frontend tests
   - Run backend tests

**Status**: Automated on every push/PR

### Netlify Deployment (`netlify.toml`)

**Configuration**:

- Base directory: `apps/frontend`
- Build command: `npm run build`
- Publish directory: `out`
- Node version: 20
- NPM version: 10

**Features**:

- Automatic deployments on push to main
- Preview deployments for PRs
- SPA routing support
- Security headers (X-Frame-Options, CSP, etc.)

---

## Git Hooks

### Pre-commit Hook (Husky + Lint-staged)

**Triggers**: Before every commit

**Actions**:

- Lint and auto-fix JavaScript/TypeScript files
- Format all staged files with Prettier
- Ensure code quality before commit

**Configuration** (`package.json`):

```json
"lint-staged": {
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,yml,yaml}": [
    "prettier --write"
  ]
}
```

### Commit Message Hook (commitlint)

**Triggers**: On commit message

**Purpose**: Enforces conventional commit format

**Valid formats**:

```
feat: add new feature
fix: resolve bug
docs: update documentation
test: add tests
refactor: restructure code
chore: maintenance tasks
```

**Configuration**: `commitlint.config.js`

---

## Usage Examples

### Creating a New Module

```bash
# 1. Generate module scaffold
./scripts/create-module.sh payment

# 2. Review generated documentation
cd apps/backend/src/modules/payment/.module
cat MODULE_GOALS.md

# 3. Customize documentation for your needs
# Edit MODULE_GOALS.md, ARCHITECTURE.md, etc.

# 4. Implement service and controller
# Follow templates in paymentService.ts and paymentController.ts

# 5. Write tests
# Add tests in __tests__/ directory

# 6. Check compliance
./scripts/check-module-compliance.sh payment

# 7. Fix any issues and re-check until ≥95% compliance
```

### Validating Module Quality

```bash
# Check a specific module
./scripts/check-module-compliance.sh health

# View detailed compliance report
# - Documentation completeness
# - Code quality
# - Test coverage
# - Anti-pattern detection
```

### Running Project

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build

# Test before committing
npm test

# Lint and format code
npm run lint
npm run format
```

### Making Changes

```bash
# 1. Create feature branch
git checkout -b feature/new-module

# 2. Make changes
# (pre-commit hook will auto-format)

# 3. Commit with conventional format
git commit -m "feat: add new payment module"

# 4. Run tests
npm test

# 5. Check module compliance
./scripts/check-module-compliance.sh payment

# 6. Push (triggers CI)
git push origin feature/new-module
```

---

## Best Practices

### Module Development

1. **Always use create-module.sh** for new modules
2. **Complete .module documentation** before implementation
3. **Extend base classes** (BaseService, BaseController)
4. **Use loggingService** instead of console.log
5. **Target ≥95% test coverage**
6. **Run compliance check** before PR

### Code Quality

1. **Run `npm run lint`** before committing
2. **Use conventional commits**
3. **Keep test coverage high**
4. **Document complex logic**
5. **Review anti-pattern warnings**

### CI/CD

1. **Ensure tests pass locally** before pushing
2. **Review CI failures** promptly
3. **Keep dependencies updated**
4. **Monitor deployment status**

---

## Troubleshooting

### Script Permission Issues

```bash
# Make scripts executable
chmod +x scripts/*.sh
```

### Module Compliance Low Score

1. Check error messages in compliance report
2. Add missing .module documentation files
3. Ensure base classes are extended
4. Replace console.log with loggingService
5. Add missing tests
6. Re-run compliance check

### CI/CD Failures

1. Check GitHub Actions logs
2. Ensure all tests pass locally
3. Verify node/
