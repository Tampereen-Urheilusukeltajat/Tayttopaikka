FROM node:26.8.1-alpine AS build

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy backend app and shared packages
COPY apps/backend ./apps/backend
COPY packages ./packages

# Install only backend and its workspace deps (excludes frontend)
RUN pnpm install --frozen-lockfile --filter @tayttopaikka/backend...

# Build pricing package (consumed as compiled output by backend)
RUN pnpm --filter @tayttopaikka/pricing build

# Start the server by default, this can be overwritten at runtime
WORKDIR /app/apps/backend
EXPOSE 3000
CMD [ "pnpm", "start" ]
