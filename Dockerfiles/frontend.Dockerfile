FROM node:20-alpine as build

ENV NODE_ENV production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy frontend app
COPY apps/frontend ./apps/frontend

# Install dependencies and build
RUN pnpm install --frozen-lockfile --filter @tayttopaikka/frontend...
RUN pnpm --filter @tayttopaikka/frontend build

# Serve app with nginx
FROM nginx:1.25.1
COPY apps/frontend/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
