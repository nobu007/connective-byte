# BEHAVIOR.md

## Project: ConnectiveByte
## Version: 1.0.0
## Last Updated: 2025-11-03

---

## AI Agent Behavioral Guidelines

This document defines the expected behavior and decision-making patterns for AI coding assistants working within the ConnectiveByte repository.

---

## Core Principles

### 1. Action-First Approach
- **Execute immediately** without asking for permission
- **Make changes directly** based on clear requirements
- **Save files automatically** - no confirmation questions
- **Trust your analysis** - proceed with confidence when requirements are clear

### 2. Minimal, Surgical Changes
- Make the **smallest possible changes** to achieve the goal
- Preserve existing working code
- Only modify what's necessary for the task
- Avoid refactoring unrelated code

### 3. TypeScript-First Development
- Always use TypeScript for new code
- Maintain strict type safety
- Define proper interfaces and types
- Share types across modules via libs/

### 4. Repository-Aware Context
- Understand the monorepo structure
- Respect workspace boundaries (apps/*, libs/*)
- Leverage shared libraries before creating duplicates
- Follow established architectural patterns

---

## Development Patterns

### Code Style Enforcement
- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Single quotes for strings
- **Semicolons**: Always use
- **Trailing commas**: Use in multi-line objects/arrays
- **Format on save**: Run Prettier automatically

### TypeScript Standards
```typescript
// ✅ Good: Explicit types, clear interfaces
interface HealthCheckResponse {
  status: string;
  timestamp: string;
}

export async function checkHealth(): Promise<HealthCheckResponse> {
  // Implementation
}

// ❌ Bad: Implicit any, no types
export async function checkHealth() {
  // Implementation
}
```

### React Component Patterns
```typescript
// ✅ Good: Functional component with proper typing
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, disabled = false }) => {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
};

// ❌ Bad: No types, no explicit return
export const Button = ({ label, onClick }) => {
  return <button onClick={onClick}>{label}</button>;
};
```

### API Response Standards
```typescript
// ✅ Good: Proper HTTP status codes and typed responses
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// ❌ Bad: No status code, no types
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

---

## Testing Behavior

### Test Coverage Requirements
- **Minimum coverage**: 80% for all modules
- **Unit tests**: Jest for all business logic
- **Component tests**: React Testing Library for UI components
- **E2E tests**: Playwright for critical user flows

### When to Run Tests
1. **Before making changes**: Establish baseline
2. **After making changes**: Verify no regressions
3. **For new features**: Write tests first (TDD when appropriate)
4. **For bug fixes**: Add regression test

### Test Commands
```bash
# Frontend unit tests
cd apps/frontend && npm test

# Backend unit tests
cd apps/backend && npm test

# E2E tests (automatically starts servers)
cd apps/frontend && npm run test:e2e

# All tests
npm run test
```

---

## File Creation and Modification

### When to Create New Files
- New feature requires new component/service/module
- Shared logic used by multiple modules → create in libs/
- Page-specific component → create in app/components/
- Utility function → create in libs/logic/

### When to Modify Existing Files
- Bug fix in existing code
- Feature enhancement to existing module
- Type definition update
- Configuration change

### File Organization Rules
```
apps/frontend/
├── app/
│   ├── page.tsx              # Route pages
│   ├── layout.tsx            # Layouts
│   ├── components/           # Page-specific components
│   │   └── ComponentName.tsx
│   └── hooks/                # Custom hooks
│       └── useHookName.ts

apps/backend/
├── src/
│   ├── routes/               # API routes
│   ├── controllers/          # Business logic
│   ├── services/             # External services
│   └── middleware/           # Express middleware

libs/
├── components/               # Shared React components
├── logic/                    # Shared utilities
└── design/                   # Design tokens
```

---

## Error Handling

### Frontend Error Handling
```typescript
// ✅ Good: Proper error boundary and user feedback
try {
  const data = await fetchData();
  return data;
} catch (error) {
  console.error('Failed to fetch data:', error);
  throw new Error('Unable to load data. Please try again.');
}
```

### Backend Error Handling
```typescript
// ✅ Good: Proper error middleware and status codes
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});
```

---

## Git Workflow Behavior

### Commit Message Standards
Follow Conventional Commits specification:

```
type(scope): description

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build process or auxiliary tool changes

**Examples**:
```
feat(frontend): add health check component
fix(backend): resolve CORS middleware issue
docs(readme): update installation instructions
test(frontend): add unit tests for Button component
```

### Branch Naming
```
feature/description-of-feature
fix/description-of-bug
refactor/description-of-refactor
docs/description-of-doc-change
```

---

## Decision-Making Framework

### When to Ask for Clarification
- Requirements are ambiguous or contradictory
- Multiple valid approaches with significant trade-offs
- Breaking changes that affect public APIs
- Security-sensitive decisions

### When to Proceed Autonomously
- ✅ Requirements are clear and specific
- ✅ Change follows established patterns
- ✅ Impact is localized to one module
- ✅ Tests will validate correctness

### Priority Order for Changes
1. **Security fixes** - highest priority
2. **Critical bugs** - breaks core functionality
3. **Test failures** - blocks development
4. **Features** - new capabilities
5. **Refactoring** - code quality improvements
6. **Documentation** - helps developers

---

## Module-Specific Behaviors

### Frontend (apps/frontend)
- Use Next.js App Router patterns
- Mark client components with `'use client'`
- Implement proper loading states
- Ensure accessibility (WCAG 2.1 AA)
- Use Tailwind utility classes
- Optimize for performance (Core Web Vitals)

### Backend (apps/backend)
- Use Express.js best practices
- Implement proper CORS configuration
- Use TypeScript interfaces for request/response
- Conditional server start (exclude test environment)
- Export server instance for testing

### Shared Libraries (libs/*)
- Framework-agnostic code
- Pure functions when possible
- Comprehensive type definitions
- No external dependencies unless necessary
- Well-documented public APIs

---

## Performance Considerations

### Frontend Optimization
- Use React.lazy() for code splitting
- Implement proper image optimization
- Minimize bundle size
- Use server components when possible
- Cache API responses appropriately

### Backend Optimization
- Use async/await for I/O operations
- Implement proper database connection pooling
- Use caching for expensive operations
- Optimize middleware stack
- Monitor response times

---

## Documentation Requirements

### Code Documentation
```typescript
/**
 * Fetches health status from the backend API
 * @returns Promise containing health check response
 * @throws Error if API request fails
 */
export async function checkHealth(): Promise<HealthCheckResponse> {
  // Implementation
}
```

### When to Add Comments
- Complex business logic
- Non-obvious algorithm implementations
- Workarounds for known issues
- Performance optimizations

### When NOT to Add Comments
- Self-explanatory code
- Simple variable assignments
- Obvious function calls
- Redundant explanations

---

## Build and Deployment Behavior

### Pre-Deployment Checklist
1. ✅ All tests passing
2. ✅ No TypeScript errors
3. ✅ No ESLint errors
4. ✅ Production build successful
5. ✅ Environment variables configured

### Build Commands
```bash
# Development build
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format
```

---

## Communication Style

### When Reporting Completed Work
- Be concise and specific
- List files modified
- Mention test results
- Note any important decisions made

### When Encountering Issues
- Describe the problem clearly
- Show relevant error messages
- Explain attempted solutions
- Suggest alternatives if possible

### Response Format
```
✅ Task completed

Changes:
- Modified: apps/frontend/app/components/Button.tsx
- Added: libs/components/Button.test.tsx
- Updated: libs/components/index.ts

Tests: All passing (24/24)
Build: Successful
Lint: No errors
```

---

## Forbidden Actions

### Absolute Prohibitions
- ❌ Committing secrets or credentials
- ❌ Deleting working code without explicit instruction
- ❌ Breaking existing tests without fixing them
- ❌ Ignoring TypeScript errors
- ❌ Skipping test execution after changes
- ❌ Adding dependencies without justification
- ❌ Modifying .git configuration
- ❌ Disabling security features

---

## Quality Gates

### Before Submitting Changes
1. **Functionality**: Feature works as specified
2. **Tests**: All tests pass, new tests added
3. **Types**: No TypeScript errors
4. **Lint**: No ESLint errors
5. **Format**: Code formatted with Prettier
6. **Documentation**: Updated if necessary
7. **Performance**: No significant performance regression
8. **Accessibility**: Meets WCAG guidelines (frontend)

---

## Continuous Improvement

### Learning from Patterns
- Analyze successful implementations
- Identify recurring patterns
- Document architectural decisions
- Share knowledge through code reviews

### Adapting to Changes
- Stay updated with Next.js/React best practices
- Monitor TypeScript language updates
- Follow Express.js security advisories
- Keep dependencies current

---

## Summary: The ConnectiveByte Way

1. **Act decisively** with clear requirements
2. **Write TypeScript** with strict types
3. **Test thoroughly** before and after changes
4. **Follow patterns** established in the codebase
5. **Document intentionally** when it adds value
6. **Optimize carefully** without premature optimization
7. **Commit conventionally** with proper messages
8. **Deploy confidently** after passing all quality gates

---

This behavior specification ensures consistency, quality, and efficiency in all AI-assisted development work on the ConnectiveByte project.
