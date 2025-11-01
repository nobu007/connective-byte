# Health Check Module - Testing Strategy

## Test Coverage Goals

- **Unit Test Coverage:** 90%+
- **Integration Test Coverage:** All API endpoints
- **E2E Test Coverage:** Critical user flows

## Test Structure

### Unit Tests

**Location:** `apps/backend/src/__tests__/`

#### HealthService Unit Tests

**File:** `healthService.test.ts`

```typescript
describe('HealthService', () => {
  describe('getHealthStatus', () => {
    test('should return ok status when all checks pass');
    test('should return error status when any check fails');
    test('should include all registered checks in response');
    test('should measure response time for each check');
    test('should handle check exceptions gracefully');
  });

  describe('registerCheck', () => {
    test('should register new health check');
    test('should allow multiple checks with different names');
    test('should override check with same name');
  });

  describe('unregisterCheck', () => {
    test('should remove registered check');
    test('should not throw if check does not exist');
  });

  describe('isHealthy', () => {
    test('should return true when status is ok');
    test('should return false when status is error');
  });

  describe('default checks', () => {
    test('checkUptime should return ok status');
    test('checkMemory should return ok when usage is low');
    test('checkMemory should return error when usage is high');
  });
});
```

#### HealthController Unit Tests

**File:** `healthController.test.ts`

```typescript
describe('HealthController', () => {
  describe('handleHealthCheck', () => {
    test('should return 200 when service reports healthy');
    test('should return 503 when service reports unhealthy');
    test('should return 500 when service throws error');
    test('should format response with ApiResponse structure');
    test('should include timestamp in response');
  });

  describe('handleRoot', () => {
    test('should return welcome message');
    test('should include API endpoints information');
  });
});
```

### Integration Tests

**Location:** `apps/backend/src/__tests__/`

**File:** `api.test.ts`

```typescript
describe('API Endpoints', () => {
  describe('GET /api/health', () => {
    test('should return 200 OK with status ok');
    test('should have required fields: status, timestamp, uptime, checks');
    test('should include uptime and memory checks');
    test('should measure response time for each check');
    test('should return valid JSON');
  });

  describe('GET /', () => {
    test('should return welcome message');
    test('should return 200 OK');
  });
});
```

### E2E Tests

**Location:** `apps/frontend/e2e/`

**File:** `health-check.spec.ts`

```typescript
test('health check integration with frontend', async ({ page }) => {
  // Visit frontend page that displays health status
  await page.goto('/');

  // Wait for health check to complete
  await page.waitForSelector('[data-testid="health-status"]');

  // Verify health status is displayed
  const status = await page.textContent('[data-testid="health-status"]');
  expect(status).toContain('ok');
});
```

## Test Cases

### TC-001: Basic Health Check

**Given:** Application is running normally
**When:** GET /api/health is called
**Then:**

- Response status is 200 OK
- Response body contains `status: "ok"`
- Response includes timestamp
- Response includes uptime
- Response includes checks array

### TC-002: Degraded Health

**Given:** Memory usage > 90%
**When:** GET /api/health is called
**Then:**

- Response status is 503 Service Unavailable
- Response body contains `status: "error"`
- Memory check shows error status
- Other checks may still show ok

### TC-003: Custom Health Check Registration

**Given:** Custom health check is registered
**When:** GET /api/health is called
**Then:**

- Custom check appears in checks array
- Custom check is executed
- Response includes custom check results

### TC-004: Parallel Execution

**Given:** Multiple slow health checks (simulated)
**When:** GET /api/health is called
**Then:**

- Total response time < sum of individual check times
- All checks execute concurrently

### TC-005: Check Failure Isolation

**Given:** One health check throws exception
**When:** GET /api/health is called
**Then:**

- Failed check returns error status
- Other checks continue to execute
- Overall status reflects the failure
- Application does not crash

### TC-006: No Checks Registered

**Given:** All checks are unregistered
**When:** GET /api/health is called
**Then:**

- Response status is 200 OK
- Checks array is empty
- Overall status is ok

### TC-007: Response Time Measurement

**Given:** Health checks are registered
**When:** GET /api/health is called
**Then:**

- Each check result includes responseTime field
- responseTime is a number in milliseconds
- responseTime > 0

### TC-008: Error Response Format

**Given:** Service throws unexpected error
**When:** GET /api/health is called
**Then:**

- Response status is 500
- Response contains error message
- Response follows ApiResponse format
- In production, no stack trace exposed

## Validation Criteria

### Functional Validation

- [ ] All health checks execute successfully
- [ ] Custom checks can be registered
- [ ] Checks execute in parallel
- [ ] Failed checks are isolated
- [ ] Response format is consistent

### Performance Validation

- [ ] Health check responds in < 100ms (basic checks)
- [ ] No memory leaks over 1000 requests
- [ ] Parallel execution is faster than sequential

### Security Validation

- [ ] No sensitive data exposed in responses
- [ ] Stack traces hidden in production
- [ ] No authentication bypass vulnerabilities

### Reliability Validation

- [ ] Endpoint never crashes the application
- [ ] Handles concurrent requests correctly
- [ ] Recovers from individual check failures

## Testing Tools

### Unit Testing

- **Framework:** Jest
- **Assertion Library:** Jest matchers
- **Mocking:** Jest mock functions
- **Coverage:** Jest coverage reporter

### Integration Testing

- **HTTP Testing:** Supertest
- **API Validation:** JSON schema validation
- **Request Mocking:** MSW (Mock Service Worker)

### E2E Testing

- **Framework:** Playwright
- **Browsers:** Chromium, Firefox, WebKit
- **Server Management:** Playwright auto-start

## Running Tests

```bash
# Unit tests
cd apps/backend
npm run test

# With coverage
npm run test -- --coverage

# Watch mode
npm run test -- --watch

# Integration tests (included in npm test)
npm run test

# E2E tests
cd apps/frontend
npm run test:e2e
```

## Coverage Requirements

### Minimum Coverage Thresholds

```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 90,
        "lines": 90,
        "statements": 90
      }
    }
  }
}
```

### Critical Paths (100% Coverage Required)

- HealthService.getHealthStatus()
- HealthController.handleHealthCheck()
- Error handling in BaseService
- Error handling in BaseController

## Test Data

### Valid Health Check Response

```json
{
  "status": "success",
  "data": {
    "status": "ok",
    "timestamp": "2025-10-15T12:00:00.000Z",
    "uptime": 123.45,
    "checks": [
      {
        "name": "uptime",
        "status": "ok",
        "message": "Application running for 123.45 seconds",
        "responseTime": 1
      }
    ]
  },
  "timestamp": "2025-10-15T12:00:00.000Z"
}
```

### Unhealthy Response

```json
{
  "status": "success",
  "data": {
    "status": "error",
    "timestamp": "2025-10-15T12:00:00.000Z",
    "uptime": 123.45,
    "checks": [
      {
        "name": "memory",
        "status": "error",
        "message": "Heap: 120.00MB / 128.00MB (93.8%)",
        "responseTime": 2
      }
    ]
  },
  "timestamp": "2025-10-15T12:00:00.000Z"
}
```

## Continuous Integration

### CI Pipeline Steps

1. Install dependencies
2. Run linter (ESLint)
3. Run type checker (TypeScript)
4. Run unit tests with coverage
5. Run integration tests
6. Generate coverage report
7. Fail build if coverage < threshold

### Success Criteria

- All tests pass
- Coverage thresholds met
- No TypeScript errors
- No linting errors
