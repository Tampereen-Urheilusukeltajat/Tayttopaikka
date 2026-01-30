# Täyttöpaikka

A comprehensive diving cylinder management system for tracking gas fills, cylinder sets, storage cylinders, and invoicing.

## Overview

Täyttöpaikka is a full-stack application built with a Turborepo monorepo structure, designed to manage diving cylinder operations including:

- Diving cylinder set management
- Gas filling operations and event tracking
- Storage cylinder inventory
- Invoicing and payment tracking
- User management with role-based access control

## Architecture

This project consists of two main applications:

### Apps and Packages

- **`backend`**: Fastify-based REST API with JWT authentication, MariaDB database, and Redis caching
- **`frontend`**: React + Vite application with TypeScript
- **`packages`**: Shared packages (if any)

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

## Tech Stack

### Backend

- **Framework**: Fastify with TypeScript
- **Database**: MariaDB with Knex.js migrations
- **Cache**: Redis
- **Authentication**: JWT with bcrypt
- **Testing**: Jest
- **API Documentation**: Swagger/OpenAPI

### Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI**: Custom components with SCSS
- **State Management**: TanStack Query (React Query)
- **Testing**: Playwright

### DevOps

- **Containerization**: Docker & Docker Compose
- **Package Manager**: pnpm (v9.0.0)
- **Monorepo**: Turborepo
- **Node Version**: >=18

## Prerequisites

- Node.js >= 18
- pnpm >= 9.0.0
- Docker and Docker Compose (for local development)

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

Run all apps in development mode:

```bash
pnpm dev
```

Run specific app:

```bash
# Backend only
pnpm --filter @tayttopaikka/backend dev

# Frontend only
pnpm --filter @tayttopaikka/frontend dev
```

### Using Docker

Start all services (backend, frontend, MariaDB, Redis):

```bash
docker-compose up
```

The services will be available at:

- Frontend: http://localhost:80 (or custom `FRONTEND_PORT`)
- Backend: http://localhost:3000 (or custom `BACKEND_PORT`)
- MariaDB: localhost:3306

### Environment Variables

Create `.env` files in the respective app directories:

**Backend** (`apps/backend/.env`):

```env
DATABASE_HOST=mariadb
DATABASE_PORT=3306
DATABASE_USER=blenderi
DATABASE_PASSWORD=V3rySecretPasswor4
DATABASE_NAME=blenderi
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-secret-key
NODE_ENV=development
```

**Frontend** (`apps/frontend/.env`):

```env
VITE_API_URL=http://localhost:3000
```

## Project Structure

```
apps/
├── backend/              # Fastify API server
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── database/     # Database config & migrations
│   │   ├── lib/          # Auth, queries, utilities
│   │   ├── types/        # TypeScript type definitions
│   │   └── test/         # Jest tests
│   └── package.json
├── frontend/             # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── views/        # Page views
│   │   ├── interfaces/   # TypeScript interfaces
│   │   └── lib/          # Utilities and helpers
│   └── package.json
Dockerfiles/              # Docker build files
└── packages/             # Shared packages
```

## Available Scripts

### Root Level

- `pnpm dev` - Run all apps in development mode
- `pnpm build` - Build all apps
- `pnpm lint` - Lint all apps
- `pnpm format` - Format code with Prettier
- `pnpm check-types` - TypeScript type checking

### Backend

- `pnpm dev` - Start development server with nodemon
- `pnpm test` - Run Jest tests
- `pnpm start` - Start production server

### Frontend

- `pnpm dev` - Start Vite dev server
- `pnpm build` - Build for production
- `pnpm test` - Run Playwright E2E tests
- `pnpm serve` - Preview production build
