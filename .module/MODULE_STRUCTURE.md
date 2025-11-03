# MODULE_STRUCTURE.md

## Project: ConnectiveByte
## Version: 1.0.0
## Last Updated: 2025-11-03

---

## Overview

This document provides a comprehensive breakdown of the ConnectiveByte monorepo structure, detailing all modules, their dependencies, file organization, and relationships. The project follows a modular monorepo architecture with npm workspaces.

---

## Monorepo Root Structure

```
connective-byte/
├── apps/                           # Application packages (frontend, backend, bot)
├── libs/                           # Shared library packages (components, logic, design)
├── docs/                           # Project documentation
├── scripts/                        # Build and automation scripts
├── .module/                        # Module-level documentation
├── .github/                        # GitHub workflows and configurations
├── package.json                    # Root package with workspace configuration
├── netlify.toml                    # Netlify deployment configuration
├── eslint.config.js                # Shared ESLint configuration
├── commitlint.config.js            # Commit message linting
└── tsconfig.json                   # Base TypeScript configuration
```

---

## Module: apps/frontend

### Purpose
Next.js 15 React application providing the user interface with server-side rendering, static generation, and modern React 19 features.

### Technology Stack
- **Framework**: Next.js 15.3.3 (App Router)
- **UI Library**: React 19.0.0
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript 5
- **Testing**: Jest 29, Playwright 1.53, React Testing Library 16
- **Mocking**: MSW 1.3.5
- **Linting**: ESLint 9 with Next.js config

### Directory Structure
```
apps/frontend/
├── app/                            # Next.js App Router directory
│   ├── page.tsx                    # Home page component
│   ├── layout.tsx                  # Root layout with metadata
│   ├── globals.css                 # Global Tailwind CSS styles
│   ├── IndexPage.tsx               # Main index page component
│   ├── components/                 # Page-specific components
│   │   ├── HealthCheck.tsx         # Backend health check component
│   │   └── __tests__/              # Component tests
│   │       └── HealthCheck.test.tsx
│   ├── hooks/                      # Custom React hooks
│   │   └── useHealthCheck.ts       # Health check custom hook
│   ├── static/                     # Static content and templates
│   │   ├── page.tsx                # Static page component
│   │   ├── template.liquid         # Liquid template example
│   │   ├── data.json               # Template data
│   │   └── output.html             # Generated HTML
│   └── __tests__/                  # Page-level tests
│       └── page.test.tsx
├── e2e/                            # Playwright E2E tests
│   ├── example.spec.ts             # Basic E2E test examples
│   ├── api-interaction.spec.ts     # API integration tests
│   └── performance.spec.ts         # Performance tests
├── mocks/                          # MSW mock handlers
│   ├── handlers.ts                 # API mock handlers
│   └── server.ts                   # MSW server setup
├── docs/                           # Frontend documentation
│   └── playwright-e2e-guide.md     # E2E testing guide
├── public/                         # Static assets
│   ├── next.svg                    # Next.js logo
│   ├── vercel.svg                  # Vercel logo
│   ├── file.svg                    # File icon
│   ├── globe.svg                   # Globe icon
│   └── window.svg                  # Window icon
├── jest.config.js                  # Jest configuration
├── jest.setup.ts                   # Jest setup with MSW
├── playwright.config.ts            # Playwright E2E configuration
├── next.config.ts                  # Next.js configuration
├── postcss.config.mjs              # PostCSS configuration for Tailwind
├── tsconfig.json                   # TypeScript configuration
└── package.json                    # Frontend dependencies and scripts
```

### Key Features
- **App Router**: Modern Next.js routing with React Server Components
- **Health Check**: Real-time backend status monitoring with `useHealthCheck` hook
- **E2E Testing**: Comprehensive Playwright tests with automatic server startup
- **Unit Testing**: Jest with React Testing Library and MSW for API mocking
- **Type Safety**: Full TypeScript coverage with strict mode
- **Responsive Design**: Tailwind CSS utility classes for mobile-first design

### Dependencies
- **Internal**: `libs/components` (StatusIndicator), `libs/logic` (health API)
- **External**: Next.js, React, Tailwind CSS, Jest, Playwright
- **Backend**: Connects to `apps/backend` on port 3001

### Scripts
```json
{
  "dev": "next dev",                    // Start development server (port 3000)
  "build": "next build",                // Production build
  "start": "next start",                // Start production server
  "lint": "next lint",                  // Run ESLint
  "lint:fix": "next lint --fix",        // Auto-fix ESLint issues
  "type-check": "tsc --noEmit",         // TypeScript type checking
  "format": "prettier --write .",       // Format code with Prettier
  "test": "jest",                       // Run Jest unit tests
  "test:e2e": "playwright test",        // Run Playwright E2E tests
  "test:watch": "jest --watch"          // Run Jest in watch mode
}
```

### Configuration Files
- **next.config.ts**: Next.js configuration with static export support
- **playwright.config.ts**: E2E test configuration with server auto-start
- **jest.config.js**: Unit test configuration with jsdom environment
- **tsconfig.json**: TypeScript strict mode with Next.js types

---

## Module: apps/backend

### Purpose
Express.js API server providing RESTful endpoints with TypeScript, comprehensive error handling, and modular architecture.

### Technology Stack
- **Framework**: Express.js 5.1.0
- **Language**: TypeScript 5.8.3
- **Runtime**: ts-node 10.9.2 for development
- **Templating**: LiquidJS 10.0.0
- **Testing**: Jest 30.0.3, Supertest 7.1.1, ts-jest 29.4.0

### Directory Structure
```
apps/backend/
├── src/
│   ├── index.ts                        # Server entry point
│   ├── app.ts                          # Express app configuration
│   ├── routes/                         # API route definitions
│   │   ├── index.ts                    # Main router aggregation
│   │   └── healthRoutes.ts             # Health check routes
│   ├── controllers/                    # Request handlers
│   │   └── healthController.ts         # Health check controller
│   ├── services/                       # Business logic layer
│   │   ├── healthService.ts            # Health check service
│   │   └── loggingService.ts           # Logging service
│   ├── middleware/                     # Express middleware
│   │   ├── errorHandler.ts             # Global error handler
│   │   └── __tests__/
│   │       └── errorHandler.test.ts
│   ├── config/                         # Configuration management
│   │   ├── index.ts                    # Config loader
│   │   └── __tests__/
│   │       └── index.test.ts
│   ├── common/                         # Shared backend utilities
│   │   ├── base/                       # Base classes
│   │   │   ├── BaseController.ts       # Base controller pattern
│   │   │   ├── BaseService.ts          # Base service pattern
│   │   │   └── __tests__/
│   │   │       ├── BaseController.test.ts
│   │   │       └── BaseService.test.ts
│   │   ├── types/                      # Shared type definitions
│   │   │   └── index.ts
│   │   └── utils/                      # Utility functions
│   │       └── validators.ts           # Input validation
│   ├── modules/                        # Feature modules
│   │   └── logging/                    # Logging module
│   │       ├── formatters/             # Log formatters
│   │       │   ├── JsonFormatter.ts
│   │       │   ├── PrettyFormatter.ts
│   │       │   ├── index.ts
│   │       │   └── __tests__/
│   │       │       ├── JsonFormatter.test.ts
│   │       │       └── PrettyFormatter.test.ts
│   │       └── transports/             # Log transports
│   │           ├── ConsoleTransport.ts
│   │           ├── FileTransport.ts
│   │           ├── index.ts
│   │           └── __tests__/
│   │               └── FileTransport.test.ts
│   ├── liquid-to-html.js               # Liquid template converter
│   └── __tests__/                      # Integration tests
│       ├── api.test.ts                 # API endpoint tests
│       ├── healthController.test.ts
│       └── healthService.test.ts
├── tests/                              # Additional test files
│   ├── api.test.ts
│   └── failure.test.ts
├── coverage/                           # Jest coverage reports
│   ├── lcov.info
│   ├── coverage-final.json
│   └── lcov-report/
├── jest.config.js                      # Jest configuration
├── tsconfig.json                       # TypeScript configuration
├── package.json                        # Backend dependencies
└── REFACTORING.md                      # Refactoring documentation
```

### Architecture Patterns
- **Layered Architecture**: Controllers → Services → Data layer
- **Base Classes**: `BaseController` and `BaseService` for code reuse
- **Dependency Injection**: Services injected into controllers
- **Error Handling**: Centralized middleware for consistent error responses
- **Module Pattern**: Feature-based organization (e.g., logging module)

### API Endpoints
```
GET /api/health
  Response: { status: "ok", timestamp: ISO8601, uptime: seconds }
  Description: Health check endpoint for monitoring
```

### Key Features
- **Modular Architecture**: Feature-based module organization
- **Type Safety**: Full TypeScript with strict mode
- **Logging System**: Extensible logging with formatters and transports
- **Error Handling**: Global error middleware with proper HTTP status codes
- **Testing**: Comprehensive test coverage with Jest and Supertest
- **Templating**: LiquidJS support for server-side rendering

### Dependencies
- **External**: Express.js, LiquidJS, TypeScript
- **Testing**: Jest, Supertest, ts-jest
- **Frontend**: Serves API requests from port 3000

### Scripts
```json
{
  "liquid-to-html": "node src/liquid-to-html.js",  // Convert Liquid templates
  "dev": "ts-node src/index.ts",                   // Start dev server (port 3001)
  "test": "jest"                                   // Run Jest tests with coverage
}
```

### Configuration Files
- **tsconfig.json**: TypeScript configuration with Node.js target
- **jest.config.js**: Jest configuration with ts-jest preset
- **REFACTORING.md**: Refactoring guidelines and history

---

## Module: apps/bot

### Purpose
Chat bot application for conversational interfaces (planned for future implementation).

### Status
**Planned** - Directory exists but implementation is pending.

### Planned Features
- Conversational AI integration
- Multi-platform bot support (Slack, Discord, etc.)
- Natural language processing
- Integration with frontend and backend

### Future Architecture
- Bot framework integration (Botkit, Hubot, or custom)
- TypeScript implementation
- Shared logic from `libs/logic`
- API communication with `apps/backend`

---

## Module: libs/components

### Purpose
Shared React component library providing reusable UI components across applications.

### Technology Stack
- **Language**: TypeScript/TSX
- **Framework**: React (version inherited from consuming apps)
- **Styling**: Tailwind CSS classes

### Directory Structure
```
libs/components/
├── StatusIndicator.tsx             # Status display component
├── config/
│   └── statusConfig.ts             # Status configuration
├── index.ts                        # Main exports
└── [future components]
```

### Key Components

#### StatusIndicator
```tsx
// Status indicator with configurable states
<StatusIndicator status="online" message="System operational" />
```
- **Props**: `status`, `message`, `size`, `variant`
- **States**: online, offline, loading, error
- **Used by**: `apps/frontend/app/components/HealthCheck.tsx`

### Export Pattern
```typescript
// libs/components/index.ts
export { StatusIndicator } from './StatusIndicator';
export * from './config/statusConfig';
```

### Dependencies
- **Internal**: None (base library)
- **External**: React, Tailwind CSS (peer dependencies)

### Future Components
- Button, Input, Modal (planned)
- Form components (planned)
- Navigation components (planned)
- Layout components (planned)

---

## Module: libs/logic

### Purpose
Framework-agnostic business logic, utility functions, and API client code shared between frontend and backend.

### Technology Stack
- **Language**: TypeScript
- **Pattern**: Pure functions for testability
- **Dependencies**: Minimal (fetch API, type definitions)

### Directory Structure
```
libs/logic/
├── api/
│   └── health.ts                   # Health check API client
├── config/
│   └── apiConfig.ts                # API configuration (base URLs, timeouts)
├── utils/
│   └── fetchWithRetry.ts           # Fetch wrapper with retry logic
├── index.ts                        # Main exports
└── [future modules]
```

### Key Modules

#### Health API
```typescript
// libs/logic/api/health.ts
export async function checkHealth(): Promise<HealthStatus>
```
- Fetches backend health status
- Handles errors and timeouts
- Returns typed health status object

#### API Configuration
```typescript
// libs/logic/config/apiConfig.ts
export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  timeout: 5000,
  retries: 3
}
```

#### Fetch with Retry
```typescript
// libs/logic/utils/fetchWithRetry.ts
export async function fetchWithRetry(url: string, options?: RequestInit, retries = 3)
```
- Automatic retry on network failures
- Configurable retry count and delay
- Exponential backoff support

### Export Pattern
```typescript
// libs/logic/index.ts
export * from './api/health';
export * from './config/apiConfig';
export * from './utils/fetchWithRetry';
```

### Dependencies
- **Internal**: None (base library)
- **External**: Native fetch API, type definitions

### Future Modules
- Data validation utilities (planned)
- Date/time formatting (planned)
- String manipulation (planned)
- Data transformation (planned)

---

## Module: libs/design

### Purpose
Design system definitions including design tokens, theme configurations, typography, colors, spacing, and brand guidelines.

### Technology Stack
- **Language**: TypeScript/JSON
- **Pattern**: Design tokens exported as constants

### Status
**Planned** - Directory exists but implementation is minimal.

### Planned Structure
```
libs/design/
├── tokens/
│   ├── colors.ts                   # Color palette
│   ├── typography.ts               # Font definitions
│   ├── spacing.ts                  # Spacing scale
│   └── breakpoints.ts              # Responsive breakpoints
├── themes/
│   ├── light.ts                    # Light theme
│   └── dark.ts                     # Dark theme
├── index.ts                        # Main exports
└── README.md                       # Design system documentation
```

### Planned Features
- **Design Tokens**: Colors, typography, spacing, shadows
- **Theme Support**: Light/dark mode with CSS variables
- **Tailwind Integration**: Extend Tailwind config with design tokens
- **Documentation**: Storybook integration for visual documentation

### Future Integration
- Tailwind CSS theme extension
- CSS custom properties generation
- Storybook for component showcase
- Design token documentation

---

## Cross-Module Dependencies

### Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                    Dependency Flow                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  apps/frontend                                               │
│       ├─→ libs/components (StatusIndicator)                 │
│       ├─→ libs/logic (health API, fetch utils)              │
│       └─→ libs/design (tokens) [planned]                    │
│                                                              │
│  apps/backend                                                │
│       └─→ libs/logic (shared utilities) [potential]         │
│                                                              │
│  apps/bot                                                    │
│       ├─→ libs/components [planned]                         │
│       ├─→ libs/logic [planned]                              │
│       └─→ apps/backend (API calls) [planned]                │
│                                                              │
│  libs/components                                             │
│       └─→ libs/design (design tokens) [planned]             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Import Examples

```typescript
// apps/frontend imports
import { StatusIndicator } from '@/libs/components';
import { checkHealth } from '@/libs/logic';

// apps/backend imports (future)
import { validateInput } from '@/libs/logic/utils';

// libs/components imports (future)
import { colors, spacing } from '@/libs/design';
```

---

## Package Management

### Workspace Configuration
```json
// Root package.json
{
  "workspaces": [
    "apps/*",
    "libs/*"
  ]
}
```

### Package Naming Convention
- **apps/frontend**: `"name": "frontend"`
- **apps/backend**: `"name": "backend"`
- **apps/bot**: `"name": "bot"` (planned)
- **libs/components**: `"name": "@connective-byte/components"` (future)
- **libs/logic**: `"name": "@connective-byte/logic"` (future)
- **libs/design**: `"name": "@connective-byte/design"` (future)

### Workspace Scripts
```json
{
  "dev": "npm-run-all --parallel dev:*",
  "dev:frontend": "npm run dev -w apps/frontend",
  "dev:backend": "npm run dev -w apps/backend",
  "build": "npm-run-all build:frontend build:backend",
  "test": "npm-run-all test:frontend test:backend",
  "lint": "npm-run-all lint:frontend lint:backend"
}
```

---

## TypeScript Configuration

### Base Configuration
```json
// Root tsconfig.json (conceptual)
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Module-Specific Configurations
- **apps/frontend**: Next.js TypeScript config with `jsx: "preserve"`
- **apps/backend**: Node.js TypeScript config with `module: "commonjs"`
- **libs/***: Library TypeScript config with `declaration: true`

---

## Testing Strategy

### Frontend Testing
- **Unit Tests**: Jest + React Testing Library
  - Component tests in `__tests__/` directories
  - MSW for API mocking
  - Coverage reporting
- **E2E Tests**: Playwright
  - Full application testing
  - API interaction testing
  - Performance testing
  - Automatic server startup

### Backend Testing
- **Unit Tests**: Jest + ts-jest
  - Service layer tests
  - Controller tests
  - Middleware tests
  - Utility function tests
- **Integration Tests**: Supertest
  - API endpoint testing
  - Error handling validation
  - Response format verification

### Test File Locations
```
apps/frontend/
  ├── app/**/__tests__/           # Component tests
  └── e2e/                        # E2E tests

apps/backend/
  ├── src/**/__tests__/           # Unit tests
  └── tests/                      # Integration tests
```

---

## Build and Deployment

### Build Process
1. **Frontend**: `next build` → Static export to `out/` directory
2. **Backend**: TypeScript compilation (production deployment)
3. **Libs**: No build step (used directly by apps)

### Deployment Targets
- **Frontend**: Netlify (configured via `netlify.toml`)
- **Backend**: Node.js hosting (Heroku, AWS, etc.)
- **Static Assets**: CDN deployment (future)

### Environment Variables
```
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Backend (.env)
PORT=3001
NODE_ENV=development
```

---

## Code Quality Tools

### Linting
- **ESLint**: Shared configuration in `eslint.config.js`
- **Frontend**: Next.js ESLint rules
- **Backend**: TypeScript ESLint rules
- **Prettier**: Code formatting across all modules

### Git Hooks
- **Husky**: Pre-commit hooks
- **lint-staged**: Run linters on staged files
- **Commitlint**: Enforce conventional commits

### Configuration Files
```
.eslintrc.json          # ESLint configuration
.prettierrc.json        # Prettier configuration
commitlint.config.js    # Commit message rules
.husky/                 # Git hooks
```

---

## Development Workflow

### Starting Development
```bash
# Install dependencies
npm install

# Start all services
npm run dev
# or
npm-run-all --parallel dev:frontend dev:backend

# Frontend: http://localhost:3000
# Backend: http://localhost:3001
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
```

### Building for Production
```bash
# Build all
npm run build

# Build frontend only
npm run build:frontend

# Build backend only
npm run build:backend
```

---

## Module Communication

### Frontend ↔ Backend
- **Protocol**: HTTP/REST
- **Format**: JSON
- **Port**: Backend on 3001, Frontend on 3000
- **Health Check**: `/api/health` endpoint
- **CORS**: Configured for local development

### Future Communication Patterns
- **GraphQL**: Planned for complex data fetching
- **WebSocket**: Planned for real-time features
- **gRPC**: Considered for microservices

---

## Module Evolution Guidelines

### Adding New Modules
1. Create directory under `apps/` or `libs/`
2. Initialize with `package.json`
3. Add to workspace configuration
4. Document in this file
5. Update dependency graph
6. Add to CI/CD pipeline

### Deprecating Modules
1. Document deprecation in MODULE_GOALS.md
2. Add deprecation notice in README
3. Provide migration path
4. Remove after grace period

### Refactoring Modules
1. Document changes in module's REFACTORING.md
2. Update MODULE_STRUCTURE.md
3. Update tests
4. Maintain backward compatibility when possible

---

## Future Enhancements

### Planned Modules
- **apps/admin**: Admin dashboard (planned)
- **libs/api-client**: Generated API client (planned)
- **libs/testing**: Shared test utilities (planned)
- **libs/hooks**: Shared React hooks (planned)

### Planned Features
- Storybook for component documentation
- Shared ESLint/Prettier configs as packages
- Automated dependency updates
- Module versioning with Lerna or Changesets
- Monorepo build optimization with Turborepo/Nx

---

## References

- [MODULE_GOALS.md](.module/MODULE_GOALS.md) - Module objectives and success metrics
- [ARCHITECTURE.md](.module/ARCHITECTURE.md) - System architecture overview
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [README.md](../README.md) - Project overview and quick start

---

## Changelog

### 2025-11-03
- Initial MODULE_STRUCTURE.md creation
- Documented all current modules (frontend, backend, libs)
- Added dependency graphs and communication patterns
- Included build, test, and deployment configurations

---

## Maintenance

This document should be updated whenever:
- New modules are added to the monorepo
- Module structure changes significantly
- Dependencies between modules change
- Build or deployment processes are modified
- New tools or technologies are adopted

**Last Reviewed**: 2025-11-03
**Next Review**: 2025-12-03
