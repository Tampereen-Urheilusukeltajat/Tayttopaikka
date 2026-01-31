FROM node:24.12.0-alpine as build

ENV NODE_ENV production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy backend app
COPY apps/backend ./apps/backend

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @tayttopaikka/backend...

# Start the server by default, this can be overwritten at runtime
WORKDIR /app/apps/backend
EXPOSE 3000
CMD [ "pnpm", "start" ]
