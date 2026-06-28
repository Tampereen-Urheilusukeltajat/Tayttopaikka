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

Create `.env` files in the respective app directories. You will find an example file in each directory.

## Deployment

### Automatic Deployment (Recommended)

**Deployments are automatically triggered when changes are pushed to the `main` branch.** The CI/CD pipeline will handle building and deploying both the frontend and backend to Fly.io.

This is the recommended approach for all production deployments to ensure consistency and proper testing.

### Manual Deployment

If you need to deploy manually (for testing or emergency fixes), run the following commands from the repository root:

```bash
# Deploy frontend
flyctl deploy --config infra/ui/fly.toml --dockerfile infra/ui/Dockerfile

# Deploy backend
flyctl deploy --config infra/backend/fly.toml --dockerfile infra/backend/Dockerfile
```

**Important:** Always deploy from the repository root directory to ensure the correct build context is used.

### Deployment Configuration

- Frontend: [infra/ui/fly.toml](infra/ui/fly.toml)
- Backend: [infra/backend/fly.toml](infra/backend/fly.toml)

## Development Workflow

New features and significant changes follow a spec-driven workflow using [OpenSpec](https://openspec.dev). This keeps changes planned and documented before code is written.

### Slash commands (Claude Code)

| Command | Purpose |
| ------- | ------- |
| `/opsx:explore` | Explore ideas and read code — no implementation |
| `/opsx:propose <name>` | Create a change with proposal, design, and tasks |
| `/opsx:apply [name]` | Implement the tasks in a change |
| `/opsx:archive [name]` | Archive a completed change |

### Typical flow

```text
1. /opsx:explore          # Discuss the problem, read relevant code
2. /opsx:propose <name>   # Generate proposal.md + design.md + tasks.md
3. /opsx:apply            # Implement task by task
4. /opsx:archive          # Archive when done
```

Change artifacts are stored in `openspec/changes/`. Project context for the AI is configured in `openspec/config.yaml`.

## License

This project is licensed under the GNU AFFERO GENERAL PUBLIC LICENSE — see the LICENSE file for details.

In the past, the project used the MIT license and the code built during that time remains licensed as such. From now on, the new license applies to all new code and refactored parts of the software.
