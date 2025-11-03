# ARCHITECTURE.md

## Project: ConnectiveByte
## Version: 1.0.0
## Last Updated: 2025-11-03

---

## Overview

ConnectiveByte is a modern full-stack web development framework built as a TypeScript monorepo. The architecture emphasizes connectivity, extensibility, and maintainability through clean separation of concerns, shared libraries, and modern development practices.

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ConnectiveByte Monorepo                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Frontend    │  │   Backend    │  │     Bot      │     │
│  │  (Next.js)   │  │  (Express)   │  │  (Planned)   │     │
│  │  Port: 3000  │  │  Port: 3001  │  │              │     │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘     │
│         │                  │                                │
│         └──────────────────┴──────────────┐                │
│                                            │                │
│              ┌─────────────────────────────▼─────┐          │
│              │     Shared Libraries              │          │
│              │  ┌───────────┬────────┬────────┐ │          │
│              │  │Components │ Logic  │ Design │ │          │
│              │  └───────────┴────────┴────────┘ │          │
│              └───────────────────────────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

### Directory Layout

```
connective-byte/
├── apps/                           # Application packages
│   ├── frontend/                   # Next.js React application
│   │   ├── app/                    # Next.js App Router
│   │   │   ├── page.tsx            # Main page component
│   │   │   ├── layout.tsx          # Root layout
│   │   │   ├── globals.css         # Global styles
│   │   │   ├── components/         # Page-specific components
│   │   │   └── hooks/              # Custom React hooks
│   │   ├── public/                 # Static assets
│   │   ├── e2e/                    # Playwright E2E tests
│   │   ├── __tests__/              # Jest unit tests
│   │   ├── mocks/                  # MSW API mocks
│   │   ├── next.config.ts          # Next.js configuration
│   │   ├── tailwind.config.ts      # Tailwind CSS configuration
│   │   ├── playwright.config.ts    # Playwright configuration
│   │   └── jest.config.js          # Jest configuration
│   │
│   ├── backend/                    # Express.js API server
│   │   ├── src/                    # Source code
│   │   │   ├── index.ts            # Server entry point
│   │   │   └── liquid-to-html.js   # Template converter
│   │   ├── tests/                  # Jest tests
│   │   ├── coverage/               # Test coverage reports
│   │   ├── jest.config.js          # Jest configuration
│   │   └── tsconfig.json           # TypeScript configuration
│   │
│   └── bot/                        # Chat bot (planned)
│
├── libs/                           # Shared libraries
│   ├── components/                 # Reusable React components
│   ├── logic/                      # Business logic & utilities
│   └── design/                     # Design system definitions
│
├── scripts/                        # Build and utility scripts
├── docs/                           # Documentation
├── .module/                        # Module configuration
│   ├── MODULE_GOALS.md            # Module objectives
│   └── ARCHITECTURE.md            # This file
│
├── package.json                    # Root package configuration
├── netlify.toml                    # Netlify deployment config
├── eslint.config.js               # ESLint configuration
├── commitlint.config.js           # Commitlint configuration
└── tsconfig.json                  # Root TypeScript configuration
```

---

## Application Architecture

### Frontend (apps/frontend)

**Framework**: Next.js 15 with React 19

#### Technology Stack
- **UI Framework**: React 19 with Server/Client Components
- **Routing**: Next.js App Router
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Testing**: Jest + React Testing Library + Playwright
- **API Mocking**: Mock Service Worker (MSW)

#### Architecture Pattern
```
Frontend Architecture (Next.js App Router)
┌────────────────────────────────────────┐
│         app/ (App Router)              │
│  ┌──────────────────────────────────┐  │
│  │  page.tsx (Server Component)     │  │
│  │  └─► IndexPage (Client Component)│  │
│  │       ├─► HealthCheck Component  │  │
│  │       └─► Other Features         │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  layout.tsx (Root Layout)        │  │
│  │  └─► HTML structure + metadata   │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  components/ (Feature Components)│  │
│  │  hooks/ (Custom Hooks)           │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
         │
         ├─► API: /api/health (Backend)
         └─► Static Export for Netlify
```

#### Key Features
- **Server Components**: Default for optimal performance
- **Client Components**: Interactive UI with 'use client' directive
- **Static Export**: Pre-rendered HTML for Netlify deployment
- **API Integration**: Health check with backend status display
- **Responsive Design**: Mobile-first with Tailwind CSS
- **Testing**: Comprehensive unit and E2E test coverage

#### Configuration
- **Port**: 3000 (development)
- **Output**: Static export (`output: 'export'`)
- **Image Optimization**: Disabled for static export
- **Trailing Slash**: Enabled for better routing

---

### Backend (apps/backend)

**Framework**: Express.js with TypeScript

#### Technology Stack
- **Server Framework**: Express.js v5
- **Language**: TypeScript
- **Templating**: LiquidJS
- **Testing**: Jest + Supertest
- **Runtime**: Node.js with ts-node

#### Architecture Pattern
```
Backend Architecture (Express.js)
┌────────────────────────────────────────┐
│         Express Server                 │
│  ┌──────────────────────────────────┐  │
│  │  src/index.ts (Entry Point)      │  │
│  │  ├─► Express app instance        │  │
│  │  ├─► Middleware configuration    │  │
│  │  └─► Route handlers              │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  API Routes                       │  │
│  │  └─► GET /api/health             │  │
│  │       └─► { status: "ok" }       │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Liquid Template Processor       │  │
│  │  └─► liquid-to-html.js           │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
         │
         └─► Exports app for testing
```

#### Key Features
- **RESTful API**: Clean endpoint design with proper HTTP semantics
- **Health Monitoring**: `/api/health` endpoint for status checks
- **Template Processing**: LiquidJS for dynamic content generation
- **Module Exports**: App instance exported for testing
- **Conditional Start**: Server only starts outside test environment
- **Type Safety**: Full TypeScript implementation

#### Configuration
- **Port**: 3001 (development)
- **Runtime**: ts-node for development
- **Testing**: Jest with ts-jest transformer
- **Coverage**: Comprehensive test coverage reports

---

## Shared Libraries

### libs/components
**Purpose**: Reusable React UI components

#### Architecture
- Atomic design principles
- Type-safe component interfaces
- Framework-agnostic where possible
- Comprehensive prop documentation

#### Future Features
- Storybook documentation
- Visual regression testing
- Accessibility compliance testing

---

### libs/logic
**Purpose**: Shared business logic and utilities

#### Architecture
- Pure functions for testability
- Framework-agnostic implementation
- Minimal dependencies
- Type-safe interfaces

#### Characteristics
- Reusable across frontend and backend
- Data validation and transformation
- Common utility functions
- High test coverage

---

### libs/design
**Purpose**: Design system definitions

#### Architecture
- Design tokens (colors, typography, spacing)
- Theme configurations
- Brand guidelines
- Style constants

#### Benefits
- Single source of truth for design
- Consistent UI across applications
- Easy theme customization
- Designer-developer collaboration

---

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Start all services in parallel
npm run dev
# ├─► Frontend: http://localhost:3000
# └─► Backend: http://localhost:3001

# Or start individually
npm run dev:frontend  # Frontend only
npm run dev:backend   # Backend only
```

### Testing Strategy

#### Unit Testing (Jest)
```bash
# Run all tests
npm run test

# Frontend tests
npm run test:frontend

# Backend tests
npm run test:backend

# Watch mode
npm run test:watch -w apps/frontend
```

#### E2E Testing (Playwright)
```bash
# Run E2E tests
npm run test:e2e

# Playwright automatically:
# 1. Starts frontend on port 3000
# 2. Starts backend on port 3001
# 3. Runs tests against both
# 4. Shuts down servers
```

#### Testing Architecture
```
Testing Pyramid
┌─────────────────────────────────────┐
│         E2E Tests                   │ ← Playwright
│      (Full integration)             │
├─────────────────────────────────────┤
│     Integration Tests               │ ← Jest + Supertest
│   (API + Component)                 │
├─────────────────────────────────────┤
│       Unit Tests                    │ ← Jest + RTL
│  (Components + Logic)               │
└─────────────────────────────────────┘
```

---

### Build Process

#### Development Build
```bash
npm run dev
# Hot module replacement
# Fast refresh
# Source maps enabled
```

#### Production Build
```bash
npm run build
# ├─► Frontend: Next.js static export
# └─► Backend: TypeScript compilation
```

#### Build Output
- **Frontend**: Static HTML/CSS/JS in `apps/frontend/out/`
- **Backend**: Compiled JavaScript in `apps/backend/dist/`

---

## Deployment Architecture

### Netlify Deployment

```
Deployment Pipeline
┌────────────────────────────────────────┐
│  Git Push to main branch               │
└───────────┬────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│  Netlify Build Process                 │
│  ┌──────────────────────────────────┐  │
│  │  1. Install dependencies         │  │
│  │  2. cd apps/frontend             │  │
│  │  3. npm run build                │  │
│  │  4. Generate static export       │  │
│  └──────────────────────────────────┘  │
└───────────┬────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│  Deployed to Netlify CDN               │
│  - Static HTML/CSS/JS                  │
│  - Optimized assets                    │
│  - Security headers                    │
└────────────────────────────────────────┘
```

#### Deployment Configuration (netlify.toml)
- **Base Directory**: `apps/frontend`
- **Build Command**: `npm run build`
- **Publish Directory**: `out`
- **Node Version**: 20
- **Security Headers**: X-Frame-Options, CSP, etc.

---

## Data Flow

### Frontend-Backend Communication

```
Client Request Flow
┌──────────────┐         ┌──────────────┐
│   Browser    │         │   Backend    │
│              │         │  (Port 3001)  │
└──────┬───────┘         └──────▲───────┘
       │                        │
       │  1. Fetch /api/health  │
       ├────────────────────────┤
       │                        │
       │  2. JSON Response      │
       │     { status: "ok" }   │
       ├────────────────────────┤
       │                        │
       ▼                        │
┌──────────────┐                │
│  React State │                │
│   (useState) │                │
└──────────────┘                │
```

### Development vs Production

#### Development Mode
- Direct API calls to `http://localhost:3001`
- Next.js rewrites proxy API requests
- Hot module replacement
- CORS enabled

#### Production Mode
- Static HTML deployment
- No server-side API calls
- Client-side only rendering
- API endpoints need separate hosting

---

## Code Quality Standards

### TypeScript Configuration

```typescript
// Strict mode across all packages
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### Linting & Formatting

```bash
# ESLint for code quality
npm run lint

# Prettier for formatting
npm run format

# Pre-commit hooks (Husky)
# - Lint staged files
# - Type check
# - Run affected tests
```

### Git Workflow

#### Commit Convention (Commitlint)
```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore
Scope: frontend, backend, bot, components, logic, design
Example: feat(frontend): add health check component
```

#### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: New features
- `fix/*`: Bug fixes
- `refactor/*`: Code refactoring

---

## Performance Optimization

### Frontend Optimization
- **Static Generation**: Pre-rendered HTML
- **Code Splitting**: Automatic by Next.js
- **Image Optimization**: Disabled for static export (manual optimization)
- **CSS Purging**: Tailwind removes unused CSS
- **Bundle Analysis**: webpack-bundle-analyzer

### Backend Optimization
- **Middleware**: Efficient request processing
- **Caching**: Response caching strategies
- **Compression**: Gzip/Brotli compression
- **Load Balancing**: Horizontal scaling ready

---

## Security Architecture

### Frontend Security
- **Content Security Policy**: Defined in Netlify headers
- **XSS Protection**: React escapes by default
- **HTTPS Only**: Enforced by Netlify
- **Dependency Scanning**: npm audit

### Backend Security
- **Input Validation**: Request validation middleware
- **CORS Configuration**: Controlled origin access
- **Rate Limiting**: API request throttling
- **Error Handling**: No sensitive data in responses

---

## Monitoring & Observability

### Health Checks
- Frontend: `/api/health` integration
- Backend: `/api/health` endpoint
- Status: OK/ERROR with response time

### Logging
- Development: Console logs with timestamps
- Production: Structured JSON logging (planned)
- Error tracking: Sentry integration (planned)

### Metrics (Planned)
- Response times
- Error rates
- User analytics
- Build times

---

## Scalability Considerations

### Horizontal Scaling
- Stateless application design
- CDN for static assets
- API server clustering
- Shared state via external services

### Database Strategy (Future)
- PostgreSQL for relational data
- Redis for caching
- MongoDB for document storage
- Connection pooling

### Microservices Path (Future)
- API Gateway pattern
- Service mesh
- Event-driven architecture
- Independent deployment

---

## Technology Decisions

### Why Next.js?
- Server-side rendering capability
- Static site generation
- Built-in routing
- Excellent developer experience
- Strong TypeScript support

### Why Express.js?
- Minimal and flexible
- Large ecosystem
- Well-documented
- Easy to test
- TypeScript compatible

### Why Monorepo?
- Code sharing efficiency
- Consistent tooling
- Atomic commits across packages
- Simplified dependency management
- Better developer experience

### Why TypeScript?
- Type safety reduces bugs
- Better IDE support
- Self-documenting code
- Refactoring confidence
- Industry standard

---

## Future Architecture Evolution

### Short Term (3 months)
- Complete bot application
- Expand component library
- Add Storybook
- Comprehensive E2E coverage

### Medium Term (6 months)
- GraphQL API layer
- Advanced state management (Zustand/Jotai)
- Internationalization (i18n)
- Performance monitoring dashboard

### Long Term (12+ months)
- Microservices architecture
- Plugin system
- CLI scaffolding tools
- Developer portal

---

## References

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Guide](https://expressjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)

### Internal Documentation
- [MODULE_GOALS.md](./.module/MODULE_GOALS.md) - Module objectives
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [DEPLOY_CHECKLIST.md](../DEPLOY_CHECKLIST.md) - Deployment checklist
- [TEST_PLAN.md](../TEST_PLAN.md) - Testing strategy

---

## Glossary

- **Monorepo**: Single repository containing multiple packages
- **App Router**: Next.js routing system using `app/` directory
- **Static Export**: Pre-rendering pages to static HTML
- **Client Component**: React component with client-side interactivity
- **Server Component**: React component rendered on the server
- **E2E**: End-to-end testing
- **CDN**: Content Delivery Network
- **MSW**: Mock Service Worker for API mocking
- **RTL**: React Testing Library

---

**Last Review**: 2025-11-03  
**Next Review**: 2025-12-03  
**Maintainer**: ConnectiveByte Team
