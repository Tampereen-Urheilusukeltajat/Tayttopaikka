FROM node:24.12.0-alpine AS build

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy frontend app and shared packages
COPY apps/frontend ./apps/frontend
COPY packages ./packages

# Install only frontend and its workspace deps (excludes backend)
RUN pnpm install --frozen-lockfile --filter @tayttopaikka/frontend...

# Build in dependency order: pricing first, then frontend
RUN pnpm --filter @tayttopaikka/pricing build
RUN NODE_ENV=production pnpm --filter @tayttopaikka/frontend build

# Serve app with nginx
FROM nginx:1.25.1
COPY apps/frontend/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
