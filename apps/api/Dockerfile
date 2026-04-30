FROM node:20-slim AS build
WORKDIR /app
RUN corepack enable

COPY package.json ./
COPY pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install --no-frozen-lockfile; fi

COPY . .
RUN pnpm build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
RUN corepack enable

COPY package.json ./
COPY pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --prod --frozen-lockfile; else pnpm install --prod --no-frozen-lockfile; fi

COPY --from=build /app/dist ./dist

EXPOSE 8080
CMD ["sh", "-c", "pnpm start"]
