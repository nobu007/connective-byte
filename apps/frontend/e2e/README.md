# E2E Test Suite

This directory contains comprehensive end-to-end tests for the ConnectiveByte frontend application using Playwright.

## Test Categories

### 1. Page Content Tests (`pages.spec.ts`)

Tests page content and structure:

- Homepage hero, problem statement, value propositions and CTA
- About page sections (mission, philosophy, values, vision)
- Privacy policy sections and table of contents
- Footer content and links
- SEO meta tags

### 2. Navigation Tests (`navigation.spec.ts`)

Tests navigation behavior:

- Navigation between all pages
- Active page highlighting (`aria-current="page"`)
- Mobile menu (open/close/navigate)
- Accessible navigation landmark

### 3. Contact Form Tests (`contact-form.spec.ts`)

Tests the contact form:

- Field display and accessibility attributes
- Validation errors (empty form, invalid email, missing consent)
- Successful submission
- Privacy policy link

### 4. Newsletter Tests (`newsletter-signup.spec.ts`, `newsletter-accessibility-audit.spec.ts`)

Tests the newsletter signup form:

- Signup flow and validation
- Accessibility audit (ARIA labels, keyboard navigation, screen reader support)
- Performance audit

### 5. Performance Tests (`performance.spec.ts`)

Tests API performance and response times:

- Health check API response time validation
- Performance threshold monitoring

### 6. Responsive Layout Tests (`responsive-layout.spec.ts`)

Tests visual consistency across viewports using screenshot comparison:

- Desktop, tablet and mobile layouts
- Baseline screenshots in `responsive-layout.spec.ts-snapshots/`

## Running Tests

### Run all E2E tests

```bash
npm run test:e2e -w apps/frontend
```

### Run specific test file

```bash
npm run test:e2e -w apps/frontend -- navigation.spec.ts
```

### Update visual regression baselines

When UI changes are intentional, update the baseline screenshots:

```bash
npm run test:e2e -w apps/frontend -- responsive-layout.spec.ts --update-snapshots
```

## Visual Regression Testing

Visual regression tests use Playwright's screenshot comparison feature to detect unintended UI changes.

### How it works:

1. **Baseline Creation**: First run creates baseline screenshots in `e2e/responsive-layout.spec.ts-snapshots/`
2. **Comparison**: Subsequent runs compare current screenshots against baselines
3. **Failure**: Tests fail if screenshots differ beyond the threshold
4. **Update**: Use `--update-snapshots` flag to accept new visuals as baseline

### Best Practices:

- Disable animations in visual tests for consistency
- Use fixed timestamps for predictable content
- Test multiple viewports (desktop, tablet, mobile)
- Review visual diffs carefully before updating baselines

## Test Configuration

Tests are configured in `playwright.config.ts` with:

- Automatic server startup (frontend on port 3000, backend on port 3001)
- 30-second timeout per test
- Chromium browser only (for faster execution)
- HTML report generation

## Troubleshooting

### Tests hanging

- Check if servers are already running on ports 3000/3001
- Verify `reuseExistingServer: true` in playwright.config.ts

### Visual regression failures

- Review the HTML report: `npx playwright show-report`
- Check if UI changes were intentional
- Update baselines if changes are expected: `--update-snapshots`

### Strict mode violations

When a locator resolves to multiple elements, Playwright fails the test. Scope
locators to a container (e.g. `page.locator('main form')`) or use
`{ exact: true }`. Common duplicate sources on this site: the footer
newsletter form (email label, consent checkbox, privacy link) and `<title>`
elements (matched by `getByText` substring).

### Flaky tests

- Increase timeouts if needed
- Ensure proper wait conditions (e.g. `toBeVisible()`)
- Check for race conditions in async operations
