# E2E Test Suite

This directory contains comprehensive end-to-end tests for the ConnectiveByte frontend application using Playwright.

## Test Categories

### 1. API Interaction Tests (`api-interaction.spec.ts`)

Tests API communication and response handling:

- Success response handling
- Error response handling
- Status indicator updates

### 2. Performance Tests (`performance.spec.ts`)

Tests API performance and response times:

- Health check API response time validation
- Performance threshold monitoring

### 3. Health Monitoring Workflow Tests (`health-monitoring-workflow.spec.ts`)

Tests health monitoring functionality:

- Initial health status loading
- Error status handling
- Detailed health information display

### 4. Error Recovery Workflow Tests (`error-recovery-workflow.spec.ts`)

Tests error handling and recovery mechanisms:

- Retry logic with eventual success
- Persistent error messaging
- Network error recovery
- Timeout scenario handling

### 5. User Interaction Workflow Tests (`user-interaction-workflow.spec.ts`)

Tests user interactions and UI behavior:

- Loading state display
- Page refresh functionality
- UI component verification
- Different status response handling
- Accessibility standards compliance

### 6. Visual Regression Tests (`visual-regression.spec.ts`)

Tests visual consistency using screenshot comparison:

- Homepage screenshots in different states (success, error, loading)
- Component-level visual testing (status indicator)
- Responsive design testing (mobile, tablet)
- Dark mode visual testing

## Running Tests

### Run all E2E tests

```bash
npm run test:e2e -w apps/frontend
```

### Run specific test file

```bash
npm run test:e2e -w apps/frontend -- api-interaction.spec.ts
```

### Run visual regression tests

```bash
npm run test:e2e -w apps/frontend -- visual-regression.spec.ts
```

### Update visual regression baselines

When UI changes are intentional, update the baseline screenshots:

```bash
npm run test:e2e -w apps/frontend -- visual-regression.spec.ts --update-snapshots
```

## Visual Regression Testing

Visual regression tests use Playwright's screenshot comparison feature to detect unintended UI changes.

### How it works:

1. **Baseline Creation**: First run creates baseline screenshots in `e2e/visual-regression.spec.ts-snapshots/`
2. **Comparison**: Subsequent runs compare current screenshots against baselines
3. **Failure**: Tests fail if screenshots differ beyond the threshold
4. **Update**: Use `--update-snapshots` flag to accept new visuals as baseline

### Best Practices:

- Disable animations in visual tests for consistency
- Use fixed timestamps for predictable content
- Test multiple viewports (desktop, tablet, mobile)
- Test both light and dark modes
- Review visual diffs carefully before updating baselines

## Test Configuration

Tests are configured in `playwright.config.ts` with:

- Automatic server startup (frontend on port 3000, backend on port 3001)
- 30-second timeout per test
- Chromium browser only (for faster execution)
- HTML report generation

## Coverage

Current test coverage:

- **23 E2E tests** covering all major user workflows
- **7 visual regression tests** ensuring UI consistency
- **100% critical path coverage** for health monitoring features

## Troubleshooting

### Tests hanging

- Check if servers are already running on ports 3000/3001
- Verify `reuseExistingServer: true` in playwright.config.ts

### Visual regression failures

- Review the HTML report: `npx playwright show-report`
- Check if UI changes were intentional
- Update baselines if changes are expected: `--update-snapshots`

### Flaky tests

- Increase timeouts if needed
- Ensure proper wait conditions (e.g., `toBeVisible()`)
- Check for race conditions in async operations
