# IMPLEMENTATION.md

## Project: ConnectiveByte
## Version: 1.0.0
## Last Updated: 2025-11-03

---

## Overview

This document provides comprehensive implementation guidance for the ConnectiveByte monorepo. It covers development setup, coding standards, implementation patterns, testing strategies, and deployment procedures for all modules.

---

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Implementation Standards](#implementation-standards)
3. [Frontend Implementation](#frontend-implementation)
4. [Backend Implementation](#backend-implementation)
5. [Shared Libraries Implementation](#shared-libraries-implementation)
6. [Testing Implementation](#testing-implementation)
7. [Build and Deployment](#build-and-deployment)
8. [Common Patterns](#common-patterns)
9. [Troubleshooting](#troubleshooting)

---

## Development Environment Setup

### Prerequisites

```bash
# Required versions
Node.js >= 18.0.0
npm >= 9.0.0
Git >= 2.30.0
```

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/nobu007/connective-byte.git
cd connective-byte

# 2. Install dependencies (installs for all workspaces)
npm install

# 3. Set up environment variables
cp .env.example .env.local

# 4. Verify installation
npm run type-check
npm run lint
```

### Development Servers

```bash
# Start all services in parallel
npm run dev
# Frontend: http://localhost:3000
# Backend: http://localhost:3001

# Or start individually
npm run dev:frontend  # Frontend only on port 3000
npm run dev:backend   # Backend only on port 3001
```

### IDE Setup

#### Visual Studio Code (Recommended)

**Extensions:**
- ESLint
- Prettier - Code formatter
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- Jest Runner
- Playwright Test for VSCode

**Settings (.vscode/settings.json):**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

---

## Implementation Standards

### TypeScript Guidelines

#### Type Safety

```typescript
// ✅ Good: Explicit types
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  return fetch(`/api/users/${id}`).then(res => res.json());
}

// ❌ Bad: Implicit any
function getUser(id) {
  return fetch(`/api/users/${id}`).then(res => res.json());
}
```

#### Interface vs Type

```typescript
// ✅ Use interface for object shapes (extensible)
interface ComponentProps {
  title: string;
  onClick: () => void;
}

// ✅ Use type for unions, intersections, or utilities
type Status = 'idle' | 'loading' | 'success' | 'error';
type ReadonlyUser = Readonly<User>;
```

#### Strict Mode Configuration

```json
// tsconfig.json (all modules)
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

### Naming Conventions

```typescript
// Components: PascalCase
const UserProfile = () => { };
const HealthCheck = () => { };

// Functions: camelCase
function checkHealth() { }
async function fetchUserData() { }

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = 'http://localhost:3001';
const MAX_RETRY_COUNT = 3;

// Files:
// - Components: PascalCase (UserProfile.tsx)
// - Utilities: camelCase (fetchWithRetry.ts)
// - Types: PascalCase (User.types.ts)
// - Config: camelCase (apiConfig.ts)
```

### Code Organization

```typescript
// Module structure (order matters)
// 1. Imports
import React from 'react';
import { useState } from 'react';

// 2. Types/Interfaces
interface Props {
  title: string;
}

// 3. Constants
const DEFAULT_TIMEOUT = 5000;

// 4. Main component/function
export function Component({ title }: Props) {
  // Implementation
}

// 5. Helper functions (private)
function helperFunction() {
  // Implementation
}

// 6. Exports
export default Component;
```

### Error Handling

```typescript
// ✅ Good: Specific error handling
try {
  const data = await fetchData();
  return data;
} catch (error) {
  if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
    throw new Error('Failed to fetch data. Please check your connection.');
  }
  throw error;
}

// ✅ Good: Type guard for errors
function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

// ❌ Bad: Swallowing errors
try {
  await fetchData();
} catch (error) {
  // Silent failure
}
```

---

## Frontend Implementation

### Next.js App Router Patterns

#### Page Components

```typescript
// apps/frontend/app/page.tsx
import { Metadata } from 'next';
import IndexPage from './IndexPage';

export const metadata: Metadata = {
  title: 'ConnectiveByte',
  description: 'Modern web development framework',
};

export default function Home() {
  return <IndexPage />;
}
```

#### Client Components

```typescript
// apps/frontend/app/IndexPage.tsx
'use client';

import { useState, useEffect } from 'react';
import { HealthCheck } from './components/HealthCheck';

export default function IndexPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold">ConnectiveByte</h1>
      <HealthCheck />
    </main>
  );
}
```

#### Custom Hooks

```typescript
// apps/frontend/app/hooks/useHealthCheck.ts
import { useState, useEffect } from 'react';
import { checkHealth } from '@/libs/logic';

interface HealthStatus {
  status: 'online' | 'offline' | 'loading';
  message: string;
}

export function useHealthCheck(interval = 5000) {
  const [health, setHealth] = useState<HealthStatus>({
    status: 'loading',
    message: 'Checking...',
  });

  useEffect(() => {
    const check = async () => {
      try {
        const result = await checkHealth();
        setHealth({
          status: 'online',
          message: `Backend is ${result.status}`,
        });
      } catch (error) {
        setHealth({
          status: 'offline',
          message: 'Backend is offline',
        });
      }
    };

    check();
    const timer = setInterval(check, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return health;
}
```

### Tailwind CSS Implementation

```typescript
// Component with Tailwind classes
export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      {children}
    </div>
  );
}

// Responsive design
export function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  );
}

// Dark mode support
export function ThemeButton() {
  return (
    <button className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 rounded">
      Toggle Theme
    </button>
  );
}
```

### API Integration

```typescript
// apps/frontend/app/components/HealthCheck.tsx
'use client';

import { useHealthCheck } from '../hooks/useHealthCheck';
import { StatusIndicator } from '@/libs/components';

export function HealthCheck() {
  const health = useHealthCheck(5000);

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold mb-4">System Status</h2>
      <StatusIndicator
        status={health.status}
        message={health.message}
      />
    </div>
  );
}
```

### Next.js Configuration

```typescript
// apps/frontend/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export', // Static export for Netlify
  trailingSlash: true, // Better routing for static sites
  images: {
    unoptimized: true, // Required for static export
  },
  eslint: {
    dirs: ['app', 'components', 'lib'],
  },
  typescript: {
    // Fail build on type errors
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
```

---

## Backend Implementation

### Express.js Application Structure

#### Server Entry Point

```typescript
// apps/backend/src/index.ts
import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server (only if not in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

export default app;
```

#### Layered Architecture

```typescript
// apps/backend/src/controllers/healthController.ts
import { Request, Response } from 'express';
import { HealthService } from '../services/healthService';

export class HealthController {
  private healthService: HealthService;

  constructor() {
    this.healthService = new HealthService();
  }

  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.healthService.checkHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({ error: 'Health check failed' });
    }
  }
}

// apps/backend/src/services/healthService.ts
export class HealthService {
  async checkHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}

// apps/backend/src/routes/healthRoutes.ts
import { Router } from 'express';
import { HealthController } from '../controllers/healthController';

const router = Router();
const healthController = new HealthController();

router.get('/health', (req, res) => healthController.getHealth(req, res));

export default router;
```

#### Base Classes Pattern

```typescript
// apps/backend/src/common/base/BaseController.ts
import { Request, Response } from 'express';

export abstract class BaseController {
  protected handleError(error: unknown, res: Response): void {
    console.error('Controller error:', error);
    
    if (error instanceof Error) {
      res.status(500).json({
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  protected sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
    res.status(statusCode).json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  }
}

// apps/backend/src/common/base/BaseService.ts
export abstract class BaseService {
  protected logger(message: string, level: 'info' | 'error' | 'warn' = 'info'): void {
    const timestamp = new Date().toISOString();
    console[level](`[${timestamp}] [${this.constructor.name}] ${message}`);
  }
}
```

#### Middleware Implementation

```typescript
// apps/backend/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString(),
  });
}

// apps/backend/src/middleware/requestLogger.ts
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  
  next();
}
```

---

## Shared Libraries Implementation

### Component Library (libs/components)

```typescript
// libs/components/StatusIndicator.tsx
import React from 'react';
import { statusConfig, StatusType } from './config/statusConfig';

interface StatusIndicatorProps {
  status: StatusType;
  message: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  message,
  size = 'md',
}) => {
  const config = statusConfig[status];
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className={`flex items-center space-x-2 ${sizeClasses[size]}`}>
      <div
        className={`w-3 h-3 rounded-full ${config.color}`}
        aria-label={`Status: ${status}`}
      />
      <span className="font-medium">{message}</span>
    </div>
  );
};

// libs/components/config/statusConfig.ts
export type StatusType = 'online' | 'offline' | 'loading' | 'error';

interface StatusConfig {
  color: string;
  label: string;
}

export const statusConfig: Record<StatusType, StatusConfig> = {
  online: {
    color: 'bg-green-500',
    label: 'Online',
  },
  offline: {
    color: 'bg-gray-400',
    label: 'Offline',
  },
  loading: {
    color: 'bg-yellow-500 animate-pulse',
    label: 'Loading',
  },
  error: {
    color: 'bg-red-500',
    label: 'Error',
  },
};

// libs/components/index.ts
export { StatusIndicator } from './StatusIndicator';
export { statusConfig } from './config/statusConfig';
export type { StatusType } from './config/statusConfig';
```

### Logic Library (libs/logic)

```typescript
// libs/logic/api/health.ts
import { API_CONFIG } from '../config/apiConfig';
import { fetchWithRetry } from '../utils/fetchWithRetry';

export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime?: number;
}

export async function checkHealth(): Promise<HealthResponse> {
  const url = `${API_CONFIG.baseURL}/api/health`;
  
  try {
    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }, API_CONFIG.retries);

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Health check error:', error);
    throw error;
  }
}

// libs/logic/config/apiConfig.ts
export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  timeout: 5000,
  retries: 3,
  retryDelay: 1000,
};

// libs/logic/utils/fetchWithRetry.ts
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3,
  delay = 1000
): Promise<Response> {
  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

// libs/logic/index.ts
export * from './api/health';
export * from './config/apiConfig';
export * from './utils/fetchWithRetry';
```

---

## Testing Implementation

### Frontend Unit Testing (Jest + React Testing Library)

```typescript
// apps/frontend/app/components/__tests__/HealthCheck.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { HealthCheck } from '../HealthCheck';
import { checkHealth } from '@/libs/logic';

// Mock the logic library
jest.mock('@/libs/logic', () => ({
  checkHealth: jest.fn(),
}));

describe('HealthCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<HealthCheck />);
    expect(screen.getByText(/checking/i)).toBeInTheDocument();
  });

  it('displays online status when health check succeeds', async () => {
    (checkHealth as jest.Mock).mockResolvedValue({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });

    render(<HealthCheck />);

    await waitFor(() => {
      expect(screen.getByText(/backend is ok/i)).toBeInTheDocument();
    });
  });

  it('displays offline status when health check fails', async () => {
    (checkHealth as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<HealthCheck />);

    await waitFor(() => {
      expect(screen.getByText(/backend is offline/i)).toBeInTheDocument();
    });
  });
});
```

### Frontend E2E Testing (Playwright)

```typescript
// apps/frontend/e2e/api-interaction.spec.ts
import { test, expect } from '@playwright/test';

test.describe('API Interaction', () => {
  test('health check displays backend status', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Wait for health check to complete
    await expect(page.locator('text=/backend is/i')).toBeVisible({
      timeout: 10000,
    });

    // Verify status indicator is present
    const statusIndicator = page.locator('[aria-label^="Status:"]');
    await expect(statusIndicator).toBeVisible();
  });

  test('backend health endpoint returns valid response', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/health');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('timestamp');
  });
});
```

### Backend Unit Testing (Jest + Supertest)

```typescript
// apps/backend/src/__tests__/api.test.ts
import request from 'supertest';
import app from '../index';

describe('Health API', () => {
  it('GET /api/health returns status ok', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
  });

  it('handles invalid routes with 404', async () => {
    await request(app)
      .get('/api/invalid')
      .expect(404);
  });
});

// apps/backend/src/services/__tests__/healthService.test.ts
import { HealthService } from '../healthService';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(() => {
    service = new HealthService();
  });

  it('checkHealth returns valid health data', async () => {
    const result = await service.checkHealth();

    expect(result).toHaveProperty('status', 'ok');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('uptime');
    expect(typeof result.uptime).toBe('number');
  });
});
```

### Test Configuration

```javascript
// apps/frontend/jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

module.exports = createJestConfig(customJestConfig);

// apps/backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

---

## Build and Deployment

### Development Build

```bash
# Frontend development
cd apps/frontend
npm run dev
# Hot reload enabled
# Source maps available
# TypeScript type checking

# Backend development
cd apps/backend
npm run dev
# ts-node for TypeScript execution
# Auto-restart on file changes (if using nodemon)
```

### Production Build

```bash
# Build all applications
npm run build

# Build individually
npm run build:frontend  # Generates static export in apps/frontend/out/
npm run build:backend   # Compiles TypeScript to JavaScript
```

### Netlify Deployment

```toml
# netlify.toml
[build]
  base = "apps/frontend"
  command = "npm run build"
  publish = "out"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Backend (.env)
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# Production
# Set these in Netlify dashboard or hosting platform
NEXT_PUBLIC_API_URL=https://api.connectivebyte.com
```

### CI/CD Pipeline (GitHub Actions - Example)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm run test
      
      - name: Build frontend
        run: npm run build:frontend
      
      - name: Build backend
        run: npm run build:backend
```

---

## Common Patterns

### Async Data Fetching

```typescript
// Pattern 1: Using hooks
export function useData<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await fetcher();
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  return { data, loading, error };
}

// Pattern 2: Server-side data fetching (Next.js)
export async function getData() {
  const res = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 }, // Revalidate every hour
  });

  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }

  return res.json();
}
```

### Form Handling

```typescript
// Controlled form with validation
export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      await submitForm(formData);
      // Handle success
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      // Handle error
      console.error('Form submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### Error Boundaries

```typescript
// Frontend error boundary
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-red-600">Something went wrong</h2>
            <p className="mt-2 text-gray-600">{this.state.error?.message}</p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :3000  # Frontend
lsof -i :3001  # Backend

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3002 npm run dev:backend
```

#### TypeScript Errors

```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
rm -rf .next

# Reinstall dependencies
npm ci

# Type check without emit
npm run type-check
```

#### Build Failures

```bash
# Clear build artifacts
rm -rf apps/frontend/.next
rm -rf apps/frontend/out
rm -rf apps/backend/dist

# Clean install
rm -rf node_modules
npm ci

# Rebuild
npm run build
```

#### Test Failures

```bash
# Clear Jest cache
npx jest --clearCache

# Run tests with verbose output
npm run test -- --verbose

# Run specific test file
npm run test -- path/to/test.test.ts
```

### Performance Optimization

```typescript
// Lazy loading components
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false, // Disable SSR for client-only components
});

// Memoization
import { memo, useMemo, useCallback } from 'react';

export const ExpensiveComponent = memo(({ data }: Props) => {
  const processedData = useMemo(() => {
    return expensiveOperation(data);
  }, [data]);

  const handleClick = useCallback(() => {
    // Handler logic
  }, []);

  return <div>{/* Render */}</div>;
});
```

---

## Maintenance and Updates

### Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Update all packages
npm update

# Update specific package
npm update package-name

# Update to latest (breaking changes)
npm install package-name@latest
```

### Code Quality Checks

```bash
# Run all checks
npm run lint
npm run type-check
npm run test
npm run format

# Pre-commit hook (automatic via Husky)
# Runs on git commit
```

### Documentation Updates

```markdown
# When to update documentation:
- Adding new features → Update MODULE_GOALS.md
- Changing architecture → Update ARCHITECTURE.md
- Modifying structure → Update MODULE_STRUCTURE.md
- Implementation changes → Update IMPLEMENTATION.md (this file)
```

---

## Best Practices Checklist

### Before Committing

- [ ] Run `npm run lint` and fix all errors
- [ ] Run `npm run type-check` and fix all type errors
- [ ] Run `npm run test` and ensure all tests pass
- [ ] Run `npm run format` to format code
- [ ] Write/update tests for new features
- [ ] Update documentation if needed
- [ ] Use conventional commit message format

### Before Pull Request

- [ ] Rebase on latest main branch
- [ ] Ensure CI pipeline passes
- [ ] Add description and context to PR
- [ ] Request review from maintainers
- [ ] Link related issues

### Before Deployment

- [ ] Test production build locally
- [ ] Verify environment variables
- [ ] Check for breaking changes
- [ ] Update version numbers
- [ ] Tag release in Git

---

## References

### Internal Documentation
- [MODULE_GOALS.md](./MODULE_GOALS.md) - Project objectives
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [MODULE_STRUCTURE.md](./MODULE_STRUCTURE.md) - Module organization
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React Documentation](https://react.dev/learn)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)

---

**Last Updated**: 2025-11-03  
**Next Review**: 2025-12-03  
**Maintainer**: ConnectiveByte Team  
**Version**: 1.0.0
