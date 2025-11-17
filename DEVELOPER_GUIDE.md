# Developer Onboarding Guide

Welcome to ConnectiveByte! This guide will help you get started with development on the platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Architecture Overview](#architecture-overview)
- [Testing](#testing)
- [Code Style](#code-style)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Git**: Latest version

### Recommended Tools

- **VS Code**: With recommended extensions
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
- **Postman** or **Insomnia**: For API testing
- **Docker**: For containerized development (optional)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/nobu007/connective-byte.git
cd connective-byte
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# This will also install dependencies for all workspaces (frontend, backend, libs)
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your local configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001

# Backend
DATABASE_URL=postgresql://user:password@localhost:5432/connectivebyte
JWT_SECRET=your-local-jwt-secret
JWT_EXPIRES_IN=1d
```

### 4. Start Development Servers

```bash
# Start both frontend and backend concurrently
npm run dev

# Or start them separately:
npm run dev:frontend  # Frontend on port 3000
npm run dev:backend   # Backend on port 3001
```

### 5. Verify Installation

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Documentation: http://localhost:3001/api-docs
- Health Check: http://localhost:3001/api/health

## Project Structure

```
connective-byte/
├── apps/
│   ├── frontend/          # Next.js frontend application
│   │   ├── app/          # App router pages and layouts
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── e2e/          # Playwright E2E tests
│   │   └── mocks/        # MSW API mocks
│   │
│   └── backend/          # Express.js backend API
│       ├── src/
│       │   ├── common/   # Shared utilities and base classes
│       │   ├── config/   # Configuration files
│       │   ├── controllers/  # Request handlers
│       │   ├── middleware/   # Express middleware
│       │   ├── modules/      # Feature modules
│       │   ├── routes/       # API routes
│       │   └── services/     # Business logic
│       └── tests/        # Integration tests
│
├── libs/
│   ├── components/       # Shared React components
│   └── logic/           # Shared business logic
│
├── .github/
│   └── workflows/       # CI/CD pipelines
│
├── .kiro/
│   └── specs/          # Feature specifications
│
└── docs/               # Additional documentation
```

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature branches
- `fix/*`: Bug fix branches

### Workflow Steps

1. **Create a branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes**
   - Write code following our style guide
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**

   ```bash
   npm run lint          # Check code style
   npm run type-check    # TypeScript validation
   npm test             # Run all tests
   npm run test:e2e     # Run E2E tests
   ```

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes
   - `refactor:` Code refactoring
   - `test:` Test changes
   - `chore:` Build/tooling changes

5. **Push and create PR**

   ```bash
   git push origin feature/your-feature-name
   ```

   Create a Pull Request on GitHub with:
   - Clear description of changes
   - Link to related issues
   - Screenshots (if UI changes)

## Architecture Overview

### Clean Architecture Principles

ConnectiveByte follows clean architecture with clear separation of concerns:

```
┌─────────────────────────────────────┐
│     Presentation Layer              │
│  (React Components, Pages)          │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     Application Layer               │
│  (Controllers, Routes, Hooks)       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     Domain Layer                    │
│  (Services, Business Logic)         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     Infrastructure Layer            │
│  (Database, External APIs, Logging) │
└─────────────────────────────────────┘
```

### Key Patterns

#### Backend Patterns

**Base Classes**

- `BaseController`: Standardized request/response handling
- `BaseService`: Operation tracking and error handling

**Dependency Injection**

- Logger instances injected into services
- Promotes testability and loose coupling

**Middleware Chain**

- Security headers (helmet)
- CORS configuration
- Rate limiting
- Input sanitization
- Authentication
- Error handling

#### Frontend Patterns

**Custom Hooks**

- `useHealthCheck`: Health monitoring with retry logic
- Encapsulate complex state logic

**Error Boundaries**

- Graceful error handling
- User-friendly error messages

**API Client**

- Centralized API communication
- Automatic retry with exponential backoff

## Testing

### Test Structure

```
apps/
├── frontend/
│   ├── __tests__/          # Unit tests
│   ├── e2e/               # E2E tests
│   └── jest.setup.ts      # Jest configuration
│
└── backend/
    ├── src/**/__tests__/  # Unit tests
    └── tests/            # Integration tests
```

### Running Tests

```bash
# All tests
npm test

# Frontend tests only
npm run test:frontend

# Backend tests only
npm run test:backend

# E2E tests
npm run test:e2e

# Watch mode
npm run test:frontend -- --watch

# Coverage report
npm run test:backend -- --coverage
```

### Writing Tests

**Unit Test Example (Backend)**

```typescript
import { HealthService } from '../healthService';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(() => {
    service = new HealthService();
  });

  it('should return health status', async () => {
    const result = await service.getHealthStatus();
    expect(result.success).toBe(true);
    expect(result.data?.status).toBeDefined();
  });
});
```

**Component Test Example (Frontend)**

```typescript
import { render, screen } from '@testing-library/react';
import { HealthCheck } from '../HealthCheck';

describe('HealthCheck', () => {
  it('renders health status', () => {
    render(<HealthCheck />);
    expect(screen.getByText(/health status/i)).toBeInTheDocument();
  });
});
```

**E2E Test Example**

```typescript
import { test, expect } from '@playwright/test';

test('health check displays status', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.locator('text=Health Status')).toBeVisible();
});
```

## Code Style

### TypeScript

- Use strict TypeScript configuration
- Define interfaces for all data structures
- Avoid `any` type
- Use type inference where appropriate

```typescript
// Good
interface User {
  id: string;
  email: string;
  name: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// Avoid
function getUser(id: any): any {
  // ...
}
```

### React

- Use functional components with hooks
- Extract complex logic into custom hooks
- Use TypeScript for prop types

```typescript
// Good
interface Props {
  userId: string;
  onUpdate: (user: User) => void;
}

export function UserProfile({ userId, onUpdate }: Props) {
  const [user, setUser] = useState<User | null>(null);
  // ...
}
```

### Naming Conventions

- **Files**: kebab-case (`user-profile.tsx`)
- **Components**: PascalCase (`UserProfile`)
- **Functions**: camelCase (`getUserById`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- **Interfaces**: PascalCase with 'I' prefix optional (`User` or `IUser`)

### Code Organization

- One component per file
- Group related files in directories
- Keep files under 300 lines
- Extract reusable logic

## Common Tasks

### Adding a New API Endpoint

1. **Create route handler**

   ```typescript
   // apps/backend/src/routes/userRoutes.ts
   router.get('/api/users/:id', authenticate, handleGetUser);
   ```

2. **Implement controller**

   ```typescript
   // apps/backend/src/controllers/userController.ts
   export async function handleGetUser(req: Request, res: Response) {
     // Implementation
   }
   ```

3. **Add Swagger documentation**

   ```typescript
   /**
    * @swagger
    * /api/users/{id}:
    *   get:
    *     summary: Get user by ID
    *     // ... more swagger config
    */
   ```

4. **Write tests**
   ```typescript
   // apps/backend/src/controllers/__tests__/userController.test.ts
   describe('handleGetUser', () => {
     // Test cases
   });
   ```

### Adding a New React Component

1. **Create component file**

   ```typescript
   // apps/frontend/components/UserCard.tsx
   export function UserCard({ user }: Props) {
     return <div>{user.name}</div>;
   }
   ```

2. **Add tests**

   ```typescript
   // apps/frontend/components/__tests__/UserCard.test.tsx
   describe('UserCard', () => {
     // Test cases
   });
   ```

3. **Export from index**
   ```typescript
   // apps/frontend/components/index.ts
   export { UserCard } from './UserCard';
   ```

### Adding Environment Variables

1. **Add to `.env.example`**

   ```env
   NEW_VARIABLE=default_value
   ```

2. **Update TypeScript types** (if needed)

   ```typescript
   // apps/backend/src/types/env.d.ts
   declare namespace NodeJS {
     interface ProcessEnv {
       NEW_VARIABLE: string;
     }
   }
   ```

3. **Document in README**

### Running Database Migrations

```bash
# When database integration is added
npm run migrate:up    # Apply migrations
npm run migrate:down  # Rollback migrations
npm run migrate:create -- migration-name  # Create new migration
```

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript Errors

```bash
# Clear TypeScript cache
rm -rf apps/frontend/.next
rm -rf apps/backend/dist

# Rebuild
npm run build
```

#### Test Failures

```bash
# Clear Jest cache
npm run test:frontend -- --clearCache

# Update snapshots
npm run test:frontend -- -u
```

### Getting Help

- **Documentation**: Check `/docs` directory
- **API Docs**: http://localhost:3001/api-docs
- **Issues**: Create a GitHub issue
- **Discussions**: Use GitHub Discussions
- **Code Review**: Ask in PR comments

## Next Steps

1. **Explore the codebase**
   - Read through existing components
   - Understand the architecture
   - Review test examples

2. **Pick a task**
   - Check GitHub Issues
   - Look for "good first issue" labels
   - Ask maintainers for guidance

3. **Make your first contribution**
   - Start with documentation
   - Fix a small bug
   - Add tests

4. **Learn more**
   - Read architecture documentation
   - Review design patterns used
   - Understand CI/CD pipeline

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Conventional Commits](https://www.conventionalcommits.org/)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines.

## License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.
