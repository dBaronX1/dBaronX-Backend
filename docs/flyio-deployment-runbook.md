# Fly.io Deployment Runbook

## Fly app names
- `dbaronx-services-fastapi` (`apps/services-fastapi`)
- `dbaronx-api` (`apps/api`)
- `dbaronx-telegram-bot` (`apps/telegram-bot`)
- `dbaronx-web` (`apps/web`)
- `dbaronx-medusa` (`apps/medusa`)

## Deployment order
1. FastAPI (`dbaronx-services-fastapi`)
2. NestJS API (`dbaronx-api`)
3. Telegram Bot (`dbaronx-telegram-bot`)
4. Web (`dbaronx-web`)
5. Medusa (`dbaronx-medusa`, optional/later)

## Build and start commands by app
- FastAPI: build `python -m compileall src`, start `python -m uvicorn src.main:app --host 0.0.0.0 --port $PORT`
- API: build `pnpm --filter dbaronx-api build`, start `node dist/main.js`
- Telegram Bot: build `python -m compileall src`, start `python -m uvicorn src.main:app --host 0.0.0.0 --port $PORT`
- Web: build `pnpm --filter dbaronx-web build`, start `pnpm start --hostname 0.0.0.0 --port $PORT`
- Medusa: build `pnpm --filter @dbaronx/medusa build`, start `HOST=0.0.0.0 PORT=$PORT pnpm start`

## Fly launch/deploy commands
Run from repo root:

```bash
fly launch --name dbaronx-services-fastapi --copy-config --path apps/services-fastapi --no-deploy
fly launch --name dbaronx-api --copy-config --path apps/api --no-deploy
fly launch --name dbaronx-telegram-bot --copy-config --path apps/telegram-bot --no-deploy
fly launch --name dbaronx-web --copy-config --path apps/web --no-deploy
fly launch --name dbaronx-medusa --copy-config --path apps/medusa --no-deploy
```

Deploy in order:

```bash
fly deploy --config apps/services-fastapi/fly.toml --remote-only
fly deploy --config apps/api/fly.toml --remote-only
fly deploy --config apps/telegram-bot/fly.toml --remote-only
fly deploy --config apps/web/fly.toml --remote-only
# deploy Medusa later when commerce cutover is scheduled
fly deploy --config apps/medusa/fly.toml --remote-only
```

## Secrets commands
Set per app (examples):

```bash
fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... --app dbaronx-services-fastapi
fly secrets set INTERNAL_SERVICE_TOKEN=... DBX_RPC_URL=... --app dbaronx-services-fastapi

fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... JWT_SECRET=... --app dbaronx-nestjs-api
fly secrets set INTERNAL_SERVICE_TOKEN=... FASTAPI_BASE_URL=... --app dbaronx-nestjs-api

fly secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... --app dbaronx-telegram-bot
fly secrets set NESTJS_BASE_URL=... FASTAPI_BASE_URL=... INTERNAL_SERVICE_TOKEN=... --app dbaronx-telegram-bot

fly secrets set NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... --app dbaronx-web
fly secrets set NEXT_PUBLIC_API_BASE_URL=... --app dbaronx-web

fly secrets set DATABASE_URL=... REDIS_URL=... STORE_CORS=... ADMIN_CORS=... AUTH_CORS=... --app dbaronx-medusa
```

## Health checks
- FastAPI: `GET /health`
- API: `GET /`
- Telegram Bot: `GET /health`
- Web: `GET /`
- Medusa: `GET /health`

Manual verification:

```bash
fly status --app dbaronx-services-fastapi
fly status --app dbaronx-api
fly status --app dbaronx-telegram-bot
fly status --app dbaronx-web
fly status --app dbaronx-medusa
```

## Rollback instructions
- Immediate rollback to previous release:

```bash
fly releases --app <app-name>
fly releases rollback <version> --app <app-name>
```

- If release IDs are unknown, rollback one deploy:

```bash
fly deploy --config apps/<app>/fly.toml --image <previous-image-ref>
```

- For emergency pause of downstream dependency, scale to zero (except Medusa if always-on is required):

```bash
fly scale count 0 --app dbaronx-telegram-bot
```

## Notes
- All Node services target Node 20 images.
- Python services use pinned dependencies where available (`apps/telegram-bot/requirements.txt`) and project metadata install for FastAPI (`pyproject.toml`).
- Do not commit secrets; only use `fly secrets set`.
