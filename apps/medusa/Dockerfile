# syntax=docker/dockerfile:1
FROM node:20-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/medusa/package.json apps/medusa/package.json
RUN pnpm install --frozen-lockfile

FROM node:20-slim AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/medusa/node_modules ./apps/medusa/node_modules
COPY . .
RUN pnpm --filter @dbaronx/medusa build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/medusa/package.json apps/medusa/package.json
RUN pnpm install --filter @dbaronx/medusa --prod --frozen-lockfile
COPY --from=build /app/apps/medusa/.medusa ./apps/medusa/.medusa
COPY --from=build /app/apps/medusa/medusa-config.ts ./apps/medusa/medusa-config.ts
COPY --from=build /app/apps/medusa/package.json ./apps/medusa/package.json
WORKDIR /app/apps/medusa
EXPOSE 9000
CMD ["sh", "-c", "HOST=0.0.0.0 PORT=${PORT:-9000} pnpm start"]
