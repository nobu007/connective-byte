# TEST.md

## Project: ConnectiveByte
## Version: 1.0.0
## Last Updated: 2025-11-03

---

## Testing Overview

ConnectiveByte employs a comprehensive multi-layered testing strategy to ensure code quality, reliability, and maintainability across the monorepo. The testing approach includes unit tests, integration tests, and end-to-end tests using industry-standard tools.

---

## Testing Architecture

### Testing Layers

1. **Unit Tests**: Test individual functions, components, and modules in isolation
2. **Integration Tests**: Test interactions between modules and API endpoints
3. **End-to-End Tests**: Test complete user workflows across frontend and backend

### Test Organization

```
apps/
├── frontend/
│   ├── app/__tests__/              # Component unit tests
│   ├── e2e/                        # Playwright E2E tests
│   └── jest.config.js              # Jest configuration
├── backend/
│   ├── src/__tests__/              # Unit tests
│   ├── tests/                      # Integration tests
│   └── jest.config.js              # Jest configuration
└── bot/
    └── (future testing structure)
```

---

## Testing Tools

### Frontend Testing Stack

#### Jest (Unit Tests)
- **Purpose**: Unit testing for React components and utilities
- **Framework**: Jest with React Testing Library
- **Configuration**: `apps/frontend/jest.config.js`
- **Commands**:
  - `npm test` - Run all tests
  - `npm run test:watch` - Run tests in watch mode

**Key Features**:
- Component testing with React Testing Library
- Mock Service Worker (MSW) for API mocking
- `@testing-library/jest-dom` for DOM assertions
- `jest-environment-jsdom` for browser environment simulation

**Example Test Files**:
- `apps/frontend/app/__tests__/page.test.tsx` - Home page component tests
- `apps/frontend/app/components/__tests__/HealthCheck.test.tsx` - Health check component tests

#### Playwright (E2E Tests)
- **Purpose**: End-to-end testing for complete user workflows
- **Framework**: Playwright Test
- **Configuration**: `apps/frontend/playwright.config.ts`
- **Command**: `npm run test:e2e`

**Key Features**:
- Automatic server startup (frontend:3000, backend:3001)
- Multi-browser testing (Chromium, Firefox, WebKit)
- Screenshot and video recording on failure
- Network interception and mocking
- Parallel test execution

**Example Test Files**:
- `apps/frontend/e2e/example.spec.ts` - Basic navigation tests
- `apps/frontend/e2e/api-interaction.spec.ts` - Frontend-backend integration tests
- `apps/frontend/e2e/performance.spec.ts` - Performance and metrics tests

### Backend Testing Stack

#### Jest (Unit & Integration Tests)
- **Purpose**: Testing API endpoints, services, and utilities
- **Framework**: Jest with Supertest
- **Configuration**: `apps/backend/jest.config.js`
- **Command**: `npm test`

**Key Features**:
- Supertest for HTTP endpoint testing
- ts-jest for TypeScript support
- Coverage reporting with Istanbul
- Module mocking capabilities

**Test Structure**:
- `apps/backend/src/__tests__/` - Unit tests
  - `api.test.ts` - API endpoint tests
  - `healthController.test.ts` - Controller unit tests
  - `healthService.test.ts` - Service unit tests
- `apps/backend/tests/` - Integration tests
  - `api.test.ts` - Full API integration tests
  - `failure.test.ts` - Error handling tests

---

## Testing Commands

### Root Level
```bash
npm test              # Run all tests (frontend + backend)
npm run test:frontend # Run frontend tests only
npm run test:backend  # Run backend tests only
npm run test:e2e      # Run Playwright E2E tests
```

### Frontend (apps/frontend)
```bash
npm test              # Run Jest unit tests
npm run test:watch    # Run Jest in watch mode
npm run test:e2e      # Run Playwright E2E tests
```

### Backend (apps/backend)
```bash
npm test              # Run Jest tests with coverage
```

---

## Testing Patterns

### Frontend Testing Patterns

#### Component Testing
```typescript
// Example: Testing React components
import { render, screen } from '@testing-library/react';
import Component from './Component';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

#### API Mocking with MSW
```typescript
// Mock API responses for frontend tests
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/health', (req, res, ctx) => {
    return res(ctx.json({ status: 'ok' }));
  })
);
```

#### E2E Testing
```typescript
// Example: Playwright E2E test
import { test, expect } from '@playwright/test';

test('navigates to home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Welcome');
});
```

### Backend Testing Patterns

#### API Endpoint Testing
```typescript
// Example: Testing Express endpoints
import request from 'supertest';
import app from '../app';

describe('GET /api/health', () => {
  it('returns 200 with health status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
```

#### Service Unit Testing
```typescript
// Example: Testing service layer
import { HealthService } from '../services/healthService';

describe('HealthService', () => {
  it('returns health status', () => {
    const result = HealthService.getHealth();
    expect(result).toHaveProperty('status');
  });
});
```

#### Error Handling Tests
```typescript
// Example: Testing error scenarios
describe('Error handling', () => {
  it('returns 404 for unknown routes', async () => {
    const response = await request(app).get('/api/unknown');
    expect(response.status).toBe(404);
  });
});
```

---

## Test Configuration

### Jest Configuration (Frontend)

**Key Settings**:
- Environment: `jsdom` (browser simulation)
- Test match: `**/__tests__/**/*.test.{ts,tsx}`
- Transform: TypeScript with Next.js preset
- Setup files: `@testing-library/jest-dom`, MSW setup
- Coverage: src and app directories
- Module name mapping for path aliases

### Jest Configuration (Backend)

**Key Settings**:
- Environment: `node`
- Test match: `**/*.test.ts`
- Transform: `ts-jest` for TypeScript
- Coverage: `src/**/*.ts` excluding test files
- Coverage thresholds: configured for quality gates

### Playwright Configuration

**Key Settings**:
- Base URL: `http://localhost:3000`
- Web server: Automatic startup of frontend and backend
- Browsers: Chromium, Firefox, WebKit
- Retry: 1 retry on failure
- Screenshot: On failure
- Video: On first retry
- Trace: On first retry

---

## Testing Best Practices

### General Principles

1. **Test Isolation**: Each test should run independently
2. **Clear Naming**: Use descriptive test names (Given-When-Then pattern)
3. **Arrange-Act-Assert**: Structure tests consistently
4. **Minimal Mocking**: Mock only external dependencies
5. **Fast Tests**: Keep unit tests fast (< 1 second)

### Code Coverage Goals

- **Unit Tests**: > 80% coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Key user workflows validated

### Test Data Management

- Use factories for test data creation
- Keep test data minimal and relevant
- Clean up test data after tests
- Use realistic but safe test data

### Continuous Integration

- Run tests on every commit
- Block merges on test failures
- Generate coverage reports
- Track test trends over time

---

## Testing Workflows

### Development Workflow

1. **TDD Approach** (Recommended):
   - Write failing test first
   - Implement minimal code to pass
   - Refactor while keeping tests green

2. **Feature Development**:
   - Write unit tests for new functions/components
   - Add integration tests for API endpoints
   - Include E2E test for critical user paths

3. **Bug Fixes**:
   - Write test that reproduces the bug
   - Fix the bug
   - Verify test passes

### Pre-Commit Checks

- Husky runs lint-staged on commit
- ESLint and Prettier run automatically
- Quick smoke tests run locally

### Pre-Push Checks

- Run full test suite: `npm test`
- Verify all tests pass
- Check coverage hasn't decreased

### CI/CD Pipeline

1. Lint check (ESLint)
2. Type check (TypeScript)
3. Unit tests (Jest - Frontend & Backend)
4. Integration tests (Jest - Backend)
5. E2E tests (Playwright)
6. Build verification
7. Coverage report generation

---

## Test Environments

### Local Development
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- Database: Local/Mock data

### CI Environment
- Automated server startup
- Headless browser mode
- Mock external services
- In-memory database

### Staging Environment
- Real backend services
- Test database
- External service test accounts

---

## Debugging Tests

### Jest Debugging

```bash
# Run specific test file
npm test -- path/to/test.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="pattern"

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Playwright Debugging

```bash
# Run with UI mode
npx playwright test --ui

# Run with headed browser
npx playwright test --headed

# Debug specific test
npx playwright test --debug example.spec.ts

# Generate test code
npx playwright codegen http://localhost:3000
```

### Common Issues

**Issue**: Tests fail intermittently
- **Solution**: Check for race conditions, add proper waits

**Issue**: Mock not working
- **Solution**: Verify mock setup runs before test, check import paths

**Issue**: E2E tests timeout
- **Solution**: Increase timeout, check server startup, verify network conditions

---

## Future Testing Enhancements

### Short Term
- [ ] Increase unit test coverage to 90%
- [ ] Add visual regression tests
- [ ] Implement contract testing for APIs
- [ ] Add performance benchmarking tests

### Medium Term
- [ ] Integration with Storybook for component tests
- [ ] Mutation testing for test quality
- [ ] Accessibility testing automation (axe-core)
- [ ] API load testing (k6 or Artillery)

### Long Term
- [ ] Chaos engineering tests
- [ ] Security testing automation (OWASP ZAP)
- [ ] Cross-browser cloud testing (BrowserStack)
- [ ] AI-powered test generation

---

## Test Metrics

### Current Status

**Frontend**:
- Unit Tests: 2 test suites, multiple tests
- E2E Tests: 3 spec files
- Coverage: In progress

**Backend**:
- Unit Tests: 3 test files in src/__tests__/
- Integration Tests: 2 test files in tests/
- Coverage: Tracked with Istanbul

### Quality Gates

- All tests must pass
- No decrease in code coverage
- E2E tests pass in all target browsers
- Performance tests meet thresholds

---

## Contributing to Tests

### Adding New Tests

1. Follow existing test structure
2. Use appropriate testing layer (unit/integration/e2e)
3. Follow naming conventions
4. Include both positive and negative test cases
5. Add comments for complex test logic

### Test Review Checklist

- [ ] Tests are independent and isolated
- [ ] Test names clearly describe what is being tested
- [ ] Arrange-Act-Assert structure is followed
- [ ] No flaky tests (run multiple times to verify)
- [ ] Coverage maintained or improved
- [ ] Documentation updated if needed

---

## Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Supertest Documentation](https://github.com/ladjs/supertest)

### Internal References
- `CLAUDE.md` - Project development guide
- `MODULE_GOALS.md` - Module objectives and standards
- `ARCHITECTURE.md` - System architecture details
- `CONTRIBUTING.md` - Contribution guidelines

---

## Support

For testing questions or issues:
1. Check this documentation first
2. Review existing test examples in the codebase
3. Consult team members
4. Create an issue for test infrastructure problems

---

**Last Updated**: 2025-11-03
**Maintainer**: ConnectiveByte Team
**Version**: 1.0.0
