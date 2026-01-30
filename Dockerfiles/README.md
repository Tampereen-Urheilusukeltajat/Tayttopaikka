# Dockerfiles

This directory contains all Dockerfiles for the Tayttopaikka monorepo.

## Structure

- `backend.Dockerfile` - Backend API service (Fastify/Node.js)
- `frontend.Dockerfile` - Frontend UI service (React/Vite with nginx)

## Usage

All Docker containers should be built and run from the **root** of the monorepo:

```bash
# Build from root
docker build -f Dockerfiles/backend.Dockerfile -t tayttopaikka-backend .
docker build -f Dockerfiles/frontend.Dockerfile -t tayttopaikka-frontend .

# Or use docker-compose from root
docker-compose up
```

## Notes

- The Dockerfiles are configured for the pnpm workspace structure
- Build context must be the repository root (`.`) to access workspace files
- The frontend Dockerfile is multi-stage, using nginx for serving static files
- Backend runs with `pnpm start` and exposes port 3000
- Frontend is served via nginx on port 80
