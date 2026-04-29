# Staging Deployment Execution Checklist (Render + Vercel)

Purpose: execute staging deployment in a safe, dependency-aware order using existing infrastructure config and smoke-plan expectations.

## 0) Pre-flight (must complete before deploy)

- [ ] Confirm branch and scope are docs-only.
- [ ] Confirm no Supabase SQL changes are included.
- [ ] Confirm all required placeholder secrets are ready in your password manager / vault (do not paste real credentials into git).
- [ ] Confirm staging hostnames to use:
  - `https://<RENDER_MEDUSA_HOST>`
  - `https://<RENDER_API_HOST>`
  - `https://<RENDER_FASTAPI_HOST>`
  - `https://<VERCEL_STAGING_DOMAIN>`
- [ ] Confirm `.dbx-source` is not tracked:
  ```bash
  git ls-files .dbx-source
  ```
  Expected: no output.

---

## 1) Exact deployment order (execute in this sequence)

1. **Render `dbaronx-medusa`** (commerce dependency)
2. **Render `dbaronx-fastapi`** (service dependency for API and bot)
3. **Render `dbaronx-api`** (depends on Medusa + FastAPI URLs)
4. **Render `dbaronx-telegram-bot`** (depends on API + FastAPI URLs)
5. **Vercel `apps/web`** (depends on API URL)

> Why this order today: API and bot require upstream base URLs; web requires API URL; deploying dependencies first minimizes cascading failures.

---

## 2) Render dashboard fields to paste (exact values)

## 2.1 `dbaronx-medusa` (Render Web Service)

- **Name:** `dbaronx-medusa`
- **Environment:** `Node`
- **Root Directory:** `apps/medusa`
- **Build Command:** `pnpm install --frozen-lockfile && pnpm --filter @dbaronx/medusa build`
- **Start Command:** `pnpm --filter @dbaronx/medusa start`
- **Health Check Path:** `/health`

Env vars:

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

Health check after deploy:

- [ ] `GET https://<RENDER_MEDUSA_HOST>/health`
- [ ] Expect `HTTP 200` with health payload.

## 2.2 `dbaronx-fastapi` (Render Web Service)

- **Name:** `dbaronx-fastapi`
- **Environment:** `Python`
- **Root Directory:** `apps/services-fastapi`
- **Build Command:** `pip install -e .`
- **Start Command:** `PYTHONPATH=src python -m uvicorn src.main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path:** `/health`

Env vars:

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

Health checks after deploy:

- [ ] `GET https://<RENDER_FASTAPI_HOST>/health`
- [ ] Expect `HTTP 200` with healthy/degraded JSON status.
- [ ] `GET https://<RENDER_FASTAPI_HOST>/ready`
- [ ] Expect `HTTP 200` readiness payload.

## 2.3 `dbaronx-api` (Render Web Service)

- **Name:** `dbaronx-api`
- **Environment:** `Node`
- **Root Directory:** `apps/api`
- **Build Command:** `pnpm install --frozen-lockfile && pnpm --filter dbaronx-api build`
- **Start Command:** `pnpm --filter dbaronx-api start`
- **Health Check Path:** `/health`

Env vars:

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

Health check after deploy:

- [ ] `GET https://<RENDER_API_HOST>/health`
- [ ] Expect `HTTP 200` with JSON health payload.

## 2.4 `dbaronx-telegram-bot` (Render Worker)

- **Name:** `dbaronx-telegram-bot`
- **Environment:** `Python Worker`
- **Root Directory:** `apps/telegram-bot`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `python -m src.main`

Env vars:

```bash
ENVIRONMENT=production
TELEGRAM_BOT_TOKEN=<SECRET>
TELEGRAM_WEBHOOK_SECRET=<SECRET>
TELEGRAM_ADMIN_IDS=<SECRET_OR_COMMA_SEPARATED_IDS>
NESTJS_BASE_URL=https://<RENDER_API_HOST>
FASTAPI_BASE_URL=https://<RENDER_FASTAPI_HOST>
INTERNAL_SERVICE_TOKEN=<SECRET>
```

Health check after deploy:

- [ ] Confirm worker remains in **Running** state in Render.
- [ ] Confirm startup logs show successful initialization and no crash loop.

---

## 3) Vercel dashboard fields to paste (exact values)

Project: web app in `apps/web`

- **Framework Preset:** `Next.js`
- **Root Directory:** `apps/web`
- **Install Command:** `pnpm install --frozen-lockfile`
- **Build Command:** `pnpm --filter dbaronx-web build`
- **Output Directory:** `.next`
- **Start Command:** `pnpm --filter dbaronx-web start` (for reference if needed in non-default runtime paths)

Vercel env vars:

```bash
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://<RENDER_API_HOST>
NEXT_PUBLIC_NESTJS_BASE_URL=https://<RENDER_API_HOST>
NEXT_PUBLIC_API_URL=https://<RENDER_API_HOST>
NEXT_PUBLIC_NEST_API_URL=https://<RENDER_API_HOST>
NEST_API_URL=https://<RENDER_API_HOST>
NEST_API_TIMEOUT_MS=20000
```

Health checks after deploy:

- [ ] `GET https://<VERCEL_STAGING_DOMAIN>/`
- [ ] Expect `HTTP 200` and Next.js page content loads.
- [ ] Trigger at least one frontend call that reaches API successfully.

---

## 4) Combined env var readiness checklist (go/no-go)

Proceed only when all are present in dashboards:

- [ ] Medusa envs complete.
- [ ] FastAPI envs complete.
- [ ] API envs complete.
- [ ] Telegram bot envs complete.
- [ ] Web/Vercel envs complete.
- [ ] Cross-service URL references are consistent (`*_BASE_URL` values point to staging domains).
- [ ] Shared secrets aligned where required (for example, `INTERNAL_SERVICE_TOKEN` in API/FastAPI/bot).

---

## 5) Failure troubleshooting

## 5.1 Build fails on Render/Vercel

- Verify root directory matches service (`apps/api`, `apps/medusa`, `apps/services-fastapi`, `apps/telegram-bot`, `apps/web`).
- Verify command copy/paste has no newline truncation.
- Re-run deploy after correcting dashboard fields.

## 5.2 Service boots but health endpoint fails

- Check missing/mistyped env vars first.
- Confirm dependent upstream URL is live (`MEDUSA_BASE_URL`, `FASTAPI_BASE_URL`, `NESTJS_BASE_URL`).
- Confirm correct port env (`PORT=3001` API, `PORT=8080` FastAPI, `PORT=9000` Medusa).

## 5.3 API fails after dependency deploys

- Validate `MEDUSA_BASE_URL` and `FASTAPI_BASE_URL` resolve and return health.
- Confirm `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set and non-empty.

## 5.4 Telegram bot crash loop

- Confirm required bot tokens/secrets are set.
- Confirm `NESTJS_BASE_URL` and `FASTAPI_BASE_URL` are reachable.
- Check logs for webhook/auth misconfiguration.

## 5.5 Frontend loads but API calls fail

- Confirm all `NEXT_PUBLIC_*` API vars point to `https://<RENDER_API_HOST>`.
- Confirm API CORS-facing values are set (`FRONTEND_URL` on API, `STORE_CORS/AUTH_CORS` on Medusa where applicable).

## 5.6 Rollback path

1. Revert failed service to last known-good deploy in provider dashboard.
2. Repoint any dependent `*_BASE_URL` env vars to last known-good URLs.
3. Re-run health checks (`/health`, `/ready`, and web root).
4. Stop promotion until staging is healthy again.

---

## 6) What to deploy first today

**Deploy first: `dbaronx-medusa` on Render.**

Reason: it is a core upstream dependency and is listed first in deployment ordering for staging readiness.

## 7) What not to deploy until envs are ready

Do **not** deploy these until required env vars are fully configured and verified:

- Do not deploy `dbaronx-api` until `MEDUSA_BASE_URL`, `FASTAPI_BASE_URL`, Supabase credentials, and `INTERNAL_SERVICE_TOKEN` are set.
- Do not deploy `dbaronx-telegram-bot` until bot tokens/secrets and both upstream base URLs are set.
- Do not deploy Vercel web until all API URL env vars point to live staging API.

## 8) Post-deploy validation commands

```bash
# Track .dbx-source (must be empty output)
git ls-files .dbx-source

# Optional quick checks once hosts are live
curl -i https://<RENDER_MEDUSA_HOST>/health
curl -i https://<RENDER_FASTAPI_HOST>/health
curl -i https://<RENDER_FASTAPI_HOST>/ready
curl -i https://<RENDER_API_HOST>/health
curl -i https://<VERCEL_STAGING_DOMAIN>/
```
