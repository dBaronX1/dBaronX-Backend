# Staging Deployment Dashboard Values

Copy/paste dashboard values for **staging** deployments only. Values are sourced from `infra/render/render.yaml`, `infra/vercel/vercel.json`, and `.env.example` contracts across apps. Use placeholder secrets; never commit real credentials.

## Deployment order (staging)
1. **Render: `dbaronx-medusa`**
2. **Render: `dbaronx-fastapi`**
3. **Render: `dbaronx-api`**
4. **Render: `dbaronx-telegram-bot`**
5. **Vercel: web project (`apps/web`)**

---

## Vercel — web project
- **Root directory:** `apps/web`
- **Build command:** `pnpm --filter dbaronx-web build`
- **Start command:** `pnpm --filter dbaronx-web start`
- **Runtime:** `Node.js` (Next.js on Vercel)
- **Install command:** `pnpm install --frozen-lockfile`
- **Output directory:** `.next`
- **Health check URL:** `https://<VERCEL_STAGING_DOMAIN>/`
- **Expected response:** `HTTP 200` and Next.js page content loads.

### Required env vars (Vercel web)
```bash
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://<RENDER_API_HOST>
NEXT_PUBLIC_NESTJS_BASE_URL=https://<RENDER_API_HOST>
NEXT_PUBLIC_API_URL=https://<RENDER_API_HOST>
NEXT_PUBLIC_NEST_API_URL=https://<RENDER_API_HOST>
NEST_API_URL=https://<RENDER_API_HOST>
NEST_API_TIMEOUT_MS=20000
```

---

## Render — `dbaronx-medusa` (web service)
- **Root directory:** `apps/medusa`
- **Build command:** `pnpm install --frozen-lockfile && pnpm --filter @dbaronx/medusa build`
- **Start command:** `pnpm --filter @dbaronx/medusa start`
- **Runtime:** `Node`
- **Health check URL:** `https://<RENDER_MEDUSA_HOST>/health`
- **Expected response:** `HTTP 200` with health payload.

### Required env vars (Render medusa)
```bash
NODE_VERSION=20
NODE_ENV=production
PORT=9000
DATABASE_URL=<SECRET>
REDIS_URL=<SECRET>
STORE_CORS=https://<VERCEL_STAGING_DOMAIN>
ADMIN_CORS=https://<MEDUSA_ADMIN_DOMAIN_OR_STAGING>
AUTH_CORS=https://<VERCEL_STAGING_DOMAIN>,https://<MEDUSA_ADMIN_DOMAIN_OR_STAGING>
JWT_SECRET=<SECRET>
COOKIE_SECRET=<SECRET>
```

---

## Render — `dbaronx-api` (web service)
- **Root directory:** `apps/api`
- **Build command:** `corepack enable && pnpm install --frozen-lockfile && pnpm --filter dbaronx-api build`
- **Start command:** `pnpm --filter dbaronx-api start`
- **Runtime:** `Node`
- **Health check URL:** `https://<RENDER_API_HOST>/health`
- **Expected response:** `HTTP 200` with JSON health payload.
- **Render setup note:** Prefer **repo root** (`.`) as Root Directory for this service so workspace lockfile and filtered builds run from the monorepo root.

### Required env vars (Render api)
```bash
NODE_VERSION=20
NODE_ENV=production
PORT=3001
APP_URL=https://<RENDER_API_HOST>
FRONTEND_URL=https://<VERCEL_STAGING_DOMAIN>
SUPABASE_URL=https://<SUPABASE_PROJECT>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<SECRET>
MEDUSA_BASE_URL=https://<RENDER_MEDUSA_HOST>
FASTAPI_BASE_URL=https://<RENDER_FASTAPI_HOST>
INTERNAL_SERVICE_TOKEN=<SECRET>
```

---

## Render — `dbaronx-fastapi` (web service)
- **Root directory:** `apps/services-fastapi`
- **Build command:** `pip install -e .`
- **Start command:** `PYTHONPATH=src python -m uvicorn src.main:app --host 0.0.0.0 --port $PORT`
- **Runtime:** `Python`
- **Health check URL:** `https://<RENDER_FASTAPI_HOST>/health`
- **Expected response:** `HTTP 200` with JSON payload containing healthy/degraded status.

### Required env vars (Render fastapi)
```bash
APP_ENV=production
PORT=8080
FRONTEND_URL=https://<VERCEL_STAGING_DOMAIN>
NESTJS_BASE_URL=https://<RENDER_API_HOST>
INTERNAL_SERVICE_TOKEN=<SECRET>
JWT_SECRET=<SECRET>
SUPABASE_URL=https://<SUPABASE_PROJECT>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<SECRET>
```

---

## Render — `dbaronx-telegram-bot` (worker)
- **Root directory:** `apps/telegram-bot`
- **Build command:** `pip install -r requirements.txt`
- **Start command:** `python -m src.main`
- **Runtime:** `Python Worker`
- **Health check URL:** `N/A (worker service; no Render HTTP health check path)`
- **Expected response:** Worker stays running in Render logs with successful startup.

### Required env vars (Render telegram-bot)
```bash
ENVIRONMENT=production
TELEGRAM_BOT_TOKEN=<SECRET>
TELEGRAM_WEBHOOK_SECRET=<SECRET>
TELEGRAM_ADMIN_IDS=<SECRET_OR_COMMA_SEPARATED_IDS>
NESTJS_BASE_URL=https://<RENDER_API_HOST>
FASTAPI_BASE_URL=https://<RENDER_FASTAPI_HOST>
INTERNAL_SERVICE_TOKEN=<SECRET>
```

---

## Dashboard sanity checks
Run after setup:

```bash
git ls-files .dbx-source
```

Expected: **no output**.
