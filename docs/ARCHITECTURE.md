# ConnectiveByte Architecture Documentation

## Overview

ConnectiveByte is a modern web application built as a **monorepo** with clean architecture principles, featuring:
- **Frontend**: Next.js 15 with React 19 and TypeScript
- **Backend**: Express.js API server with TypeScript
- **Shared Libraries**: Reusable components and business logic

## Architecture Principles

### 1. Clean Architecture (Layered Approach)

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│          (Next.js Pages, Components, Hooks)                  │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                     Application Layer                        │
│              (API Services, State Management)                │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                      Domain Layer                            │
│         (Business Logic, Entities, Interfaces)               │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                  Infrastructure Layer                        │
│        (HTTP Client, Config, External Services)              │
└─────────────────────────────────────────────────────────────┘
```

### 2. Monorepo Structure

```
connective-byte/
├── apps/
│   ├── frontend/          # Next.js application
│   │   ├── app/           # App Router structure
│   │   │   ├── components/    # Page-specific components
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── layout.tsx     # Root layout
│   │   │   └── page.tsx       # Pages
│   │   ├── e2e/           # Playwright E2E tests
│   │   └── mocks/         # MSW mock handlers
│   │
│   ├── backend/           # Express.js API server
│   │   └── src/
│   │       ├── controllers/   # Request handlers
│   │       ├── services/      # Business logic
│   │       ├── middleware/    # Express middleware
│   │       ├── routes/        # Route definitions
│   │       ├── config/        # Configuration
│   │       └── app.ts         # App setup
│   │
│   └── bot/               # Future chat bot (planned)
│
├── libs/
│   ├── components/        # Shared React components
│   │   ├── StatusIndicator.tsx
│   │   └── index.ts
│   │
│   ├── logic/             # Shared business logic
│   │   ├── api/           # API client services
│   │   ├── config/        # Shared configuration
│   │   ├── utils/         # Utility functions
│   │   └── index.ts
│   │
│   └── design/            # Design system (future)
│
└── docs/                  # Documentation
```

## Frontend Architecture (Next.js)

### Layer Structure

#### 1. **Presentation Layer** (`app/`)
- **Pages**: Route-specific page components
- **Components**: Reusable UI components
- **Purpose**: Render UI and handle user interactions

**Example**: `apps/frontend/app/page.tsx`
```typescript
'use client';
import { useHealthCheck } from './hooks/useHealthCheck';

export default function Home() {
  const { status, message } = useHealthCheck();
  return <div>{message}</div>;
}
```

#### 2. **State Management Layer** (`app/hooks/`)
- **Custom Hooks**: Encapsulate state and side effects
- **Purpose**: Separate state logic from UI

**Example**: `apps/frontend/app/hooks/useHealthCheck.ts`
```typescript
export function useHealthCheck() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const checkHealth = async () => {
      const result = await fetchHealthStatus();
      setStatus(result.success ? 'success' : 'error');
    };
    checkHealth();
  }, []);

  return { status };
}
```

#### 3. **API Service Layer** (`libs/logic/api/`)
- **API Clients**: Handle HTTP communication
- **Purpose**: Centralize API calls with error handling

**Example**: `libs/logic/api/health.ts`
```typescript
export async function fetchHealthStatus(): Promise<HealthCheckResult> {
  const response = await fetchWithRetry(API_ENDPOINTS.health);
  const data = await response.json();
  return { success: true, status: data.status };
}
```

#### 4. **Infrastructure Layer** (`libs/logic/utils/`)
- **HTTP Client**: Retry logic, timeout handling
- **Configuration**: API endpoints, retry settings

**Example**: `libs/logic/utils/fetchWithRetry.ts`
```typescript
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  // Retry logic with exponential backoff
}
```

### Data Flow (Frontend)

```
User Interaction
    ↓
Component (page.tsx)
    ↓
Hook (useHealthCheck)
    ↓
API Service (fetchHealthStatus)
    ↓
Utility (fetchWithRetry)
    ↓
External API
```

## Backend Architecture (Express.js)

### Layer Structure

#### 1. **Controller Layer** (`src/controllers/`)
- **HTTP Handlers**: Process requests and responses
- **Purpose**: Handle HTTP concerns (status codes, headers, etc.)

**Example**: `apps/backend/src/controllers/healthController.ts`
```typescript
export function handleHealthCheck(req: Request, res: Response): void {
  if (!isHealthy()) {
    res.status(503).json({ status: 'error' });
    return;
  }

  const healthStatus = getHealthStatus();
  res.status(200).json(healthStatus);
}
```

#### 2. **Service Layer** (`src/services/`)
- **Business Logic**: Core application functionality
- **Purpose**: Pure business logic, independent of HTTP

**Example**: `apps/backend/src/services/healthService.ts`
```typescript
export function getHealthStatus(): HealthStatus {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}

export function isHealthy(): boolean {
  // Health check logic
  return true;
}
```

#### 3. **Route Layer** (`src/routes/`)
- **Route Definitions**: Map URLs to controllers
- **Purpose**: Define API structure

**Example**: `apps/backend/src/routes/healthRoutes.ts`
```typescript
import { Router } from 'express';
import { handleHealthCheck } from '../controllers/healthController';

const router = Router();
router.get('/health', handleHealthCheck);

export default router;
```

#### 4. **Middleware Layer** (`src/middleware/`)
- **Cross-cutting Concerns**: Error handling, logging, CORS
- **Purpose**: Process all requests/responses

**Example**: `apps/backend/src/middleware/errorHandler.ts`
```typescript
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
```

### Data Flow (Backend)

```
HTTP Request
    ↓
Middleware (Express)
    ↓
Route Definition
    ↓
Controller (healthController)
    ↓
Service (healthService)
    ↓
Response to Client
```

## Shared Libraries Architecture

### `libs/logic/` - Business Logic Library

**Purpose**: Centralize reusable business logic across applications

**Structure**:
```
libs/logic/
├── api/              # API client services
│   └── health.ts
├── config/           # Configuration management
│   └── apiConfig.ts
├── utils/            # Utility functions
│   └── fetchWithRetry.ts
└── index.ts          # Barrel exports
```

**Key Features**:
- Type-safe API clients
- Centralized configuration
- Reusable utilities
- Framework-agnostic

### `libs/components/` - Component Library

**Purpose**: Share React components across frontend applications

**Structure**:
```
libs/components/
├── StatusIndicator.tsx
└── index.ts
```

**Key Features**:
- Reusable UI components
- Type-safe props
- Framework-specific (React)

## Design Patterns

### 1. **Single Responsibility Principle (SRP)**
Each module has one reason to change:
- **Controllers**: Handle HTTP concerns only
- **Services**: Contain business logic only
- **Hooks**: Manage state and side effects only
- **Components**: Render UI only

### 2. **Dependency Inversion**
High-level modules don't depend on low-level modules:
- Components depend on hooks (not API services directly)
- Hooks depend on API services (not fetch directly)
- API services depend on utilities (not implementation details)

### 3. **Interface Segregation**
Clear, focused interfaces:
```typescript
// libs/logic/api/health.ts
export interface HealthCheckResponse {
  status: string;
  timestamp?: string;
  uptime?: number;
}

export interface HealthCheckResult {
  success: boolean;
  status: string;
  error?: string;
}
```

### 4. **Open/Closed Principle**
Open for extension, closed for modification:
- `fetchWithRetry` utility can be configured without changing code
- Health service can add checks without modifying controller

## Testing Strategy

### Frontend Testing

#### Unit Tests (Jest + React Testing Library)
- **Location**: `apps/frontend/app/__tests__/`
- **Purpose**: Test component behavior and hooks

```typescript
describe('Home Page', () => {
  it('renders with health check status', async () => {
    render(<Home />);
    expect(screen.getByText(/Connecting/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Backend status:/i)).toBeInTheDocument();
    });
  });
});
```

#### E2E Tests (Playwright)
- **Location**: `apps/frontend/e2e/`
- **Purpose**: Test full user workflows

```typescript
test('health check displays correctly', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Backend status:')).toBeVisible();
});
```

#### Mock Service Worker (MSW)
- **Location**: `apps/frontend/mocks/`
- **Purpose**: Mock API responses in tests

### Backend Testing

#### Integration Tests (Jest + Supertest)
- **Location**: `apps/backend/src/__tests__/`
- **Purpose**: Test API endpoints

```typescript
describe('GET /api/health', () => {
  it('should return 200 OK', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });
});
```

## Communication Patterns

### Frontend ↔ Backend Communication

```
Frontend (Port 3000)
    ↓ HTTP GET
Backend (Port 3001) /api/health
    ↓ JSON Response
Frontend (Status Update)
```

**Configuration**: `libs/logic/config/apiConfig.ts`
```typescript
export const apiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  retryAttempts: 3,
  retryDelay: 1000,
  timeout: 5000,
};
```

## Error Handling Strategy

### Frontend Error Handling
1. **API Layer**: Catch errors, return structured result
2. **Hook Layer**: Update state based on result
3. **Component Layer**: Display error UI

```typescript
// API Layer
try {
  const response = await fetchWithRetry(url);
  return { success: true, data };
} catch (error) {
  return { success: false, error: error.message };
}

// Hook Layer
if (result.success) {
  setStatus('success');
} else {
  setStatus('error');
}

// Component Layer
{status === 'error' && <ErrorMessage />}
```

### Backend Error Handling
1. **Controller Layer**: Try-catch for errors
2. **Middleware Layer**: Global error handler
3. **Client Response**: Consistent error format

```typescript
// Controller
try {
  const data = await service();
  res.json(data);
} catch (error) {
  next(error); // Pass to error middleware
}

// Error Middleware
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Internal server error' });
});
```

## Build and Deployment

### Development Workflow
```bash
# Frontend development
cd apps/frontend
npm run dev          # Start dev server on :3000

# Backend development
cd apps/backend
npm run dev          # Start dev server on :3001

# Testing
npm run test         # Run unit tests
npm run test:e2e     # Run E2E tests
```

### Production Build
```bash
# Build all applications
npm run build        # Root: test + minify

# Frontend build
cd apps/frontend
npm run build        # Next.js production build
npm run start        # Start production server

# Backend build
cd apps/backend
npm run dev          # TypeScript execution (ts-node)
```

### Deployment Strategy
- **Frontend**: Static export to Netlify/Vercel
- **Backend**: Node.js server deployment
- **Configuration**: Environment variables for API URLs

## Key Files Reference

### Configuration Files
- `package.json` - Root dependencies and scripts
- `apps/frontend/next.config.ts` - Next.js configuration
- `apps/backend/jest.config.js` - Backend test configuration
- `apps/frontend/jest.config.js` - Frontend test configuration
- `apps/frontend/playwright.config.ts` - E2E test configuration

### Entry Points
- `apps/frontend/app/layout.tsx` - Frontend root layout
- `apps/frontend/app/page.tsx` - Frontend homepage
- `apps/backend/src/index.ts` - Backend server startup
- `apps/backend/src/app.ts` - Express app configuration

### Shared Library Exports
- `libs/logic/index.ts` - Business logic exports
- `libs/components/index.ts` - Component library exports

## Architecture Benefits

### 1. **Maintainability**
- Clear separation of concerns
- Single responsibility per module
- Easy to locate and modify code

### 2. **Testability**
- Pure business logic (easy to test)
- Mockable dependencies
- Isolated layers

### 3. **Scalability**
- Add new features without breaking existing code
- Extend functionality through configuration
- Shared libraries reduce duplication

### 4. **Developer Experience**
- Type safety with TypeScript
- Clear code organization
- Comprehensive testing

## Future Architecture Considerations

### 1. **State Management**
- Consider adding Redux/Zustand for complex state
- Implement global state management if needed

### 2. **API Gateway**
- Add API versioning (`/api/v1/health`)
- Implement rate limiting
- Add authentication middleware

### 3. **Database Layer**
- Add ORM (Prisma/TypeORM)
- Implement repository pattern
- Separate data access logic

### 4. **Design System**
- Complete `libs/design/` implementation
- Storybook for component documentation
- Shared styling system

### 5. **Microservices**
- Split backend into domain services
- Implement event-driven architecture
- Add message queue (RabbitMQ/Redis)

## Conclusion

ConnectiveByte follows **clean architecture principles** with:
- Clear layered structure
- Strong separation of concerns
- Comprehensive testing strategy
- Type-safe implementations
- Monorepo organization for code sharing

The architecture is **production-ready** and designed for long-term maintainability and scalability.
