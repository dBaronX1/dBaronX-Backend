FROM node:20-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json ./
COPY pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile; \
    else \
      pnpm install --no-frozen-lockfile; \
    fi

FROM node:20-slim AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build
RUN mkdir -p /tmp/runtime-assets/public \
 && if [ -d /app/public ]; then cp -a /app/public/. /tmp/runtime-assets/public/; fi \
 && if [ -f /app/next.config.ts ]; then cp /app/next.config.ts /tmp/runtime-assets/; fi \
 && if [ -f /app/next.config.js ]; then cp /app/next.config.js /tmp/runtime-assets/; fi \
 && if [ -f /app/next.config.mjs ]; then cp /app/next.config.mjs /tmp/runtime-assets/; fi

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY package.json ./
COPY pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --prod --frozen-lockfile; \
    else \
      pnpm install --prod --no-frozen-lockfile; \
    fi
COPY --from=build /app/.next ./.next
COPY --from=build /tmp/runtime-assets/ ./
COPY --from=build /app/package.json ./package.json
EXPOSE 8080
CMD ["sh", "-c", "pnpm start --hostname 0.0.0.0 --port ${PORT:-8080}"]
