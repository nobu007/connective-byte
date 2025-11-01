# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ConnectiveByte is a modern web development framework built as a monorepo with Next.js frontend, Express.js backend, and shared libraries. The project emphasizes connectivity, extensibility, and maintainability through clean architecture.

## Development Commands

### Root Level Commands

- `npm run build` - Run tests and minify for production deployment
- `npm run test` - Start server and run all tests (HTML validation, accessibility, linting)
- `npm run lint` - Run all linting (CSS and JS/TS)
- `npm run format` - Format code with Prettier

### Frontend (apps/frontend)

- `npm run dev` - Start Next.js development server on port 3000
- `npm run build` - Build production Next.js application
- `npm run start` - Start production Next.js server
- `npm run test` - Run Jest unit tests
- `npm run test:watch` - Run Jest in watch mode
- `npm run test:e2e` - Run Playwright end-to-end tests
- `npm run lint` - Run Next.js ESLint
- `npm run type-check` - Run TypeScript type checking without emit

### Backend (apps/backend)

- `npm run dev` - Start Express.js development server with ts-node on port 3001
- `npm run test` - Run Jest tests
- `npm run liquid-to-html` - Convert Liquid templates to HTML

## Architecture

### Monorepo Structure

- `apps/frontend/` - Next.js React application with Tailwind CSS
- `apps/backend/` - Express.js API server with TypeScript
- `apps/bot/` - Chat bot application (planned)
- `libs/components/` - Shared React components
- `libs/logic/` - Business logic and utilities
- `libs/design/` - Design system definitions

### Key Technologies

- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS
- **Backend**: Express.js with TypeScript, LiquidJS for templating
- **Testing**: Jest (unit), Playwright (E2E), React Testing Library
- **Tooling**: ESLint, Prettier, TypeScript

### Testing Strategy

- **Unit Tests**: Jest with React Testing Library for frontend components
- **E2E Tests**: Playwright with automatic server startup for both frontend/backend
- **Test Files**: `__tests__/` directories for unit tests, `e2e/` for Playwright tests
- **Coverage**: Jest coverage reports generated for backend

### API Communication

- Frontend connects to backend via `/api/health` endpoint for health checks
- Backend runs on port 3001, frontend on port 3000
- Playwright automatically starts both servers for E2E testing

### Build and Deployment

- Production builds use `npm run build` (test + minify)
- Netlify deployment configured via `netlify.toml`
- Static export possible for frontend deployment

## Development Patterns

### Frontend Patterns

- App Router structure with `app/` directory
- Client components use `'use client'` directive
- Tailwind utility classes for styling
- Health check integration with backend status display

### Backend Patterns

- Express.js with TypeScript interfaces
- Conditional server start (excludes test environment)
- JSON API responses with proper HTTP status codes
- Module exports for testing integration

### Testing Patterns

- Mock Service Worker (MSW) for API mocking in frontend tests
- Supertest for backend API testing
- Playwright config starts both servers automatically
- Test isolation with proper setup/teardown
