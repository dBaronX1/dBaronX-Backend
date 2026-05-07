# FastAPI ↔ NestJS readiness contract

NestJS startup compatibility checks depend on FastAPI exposing stable HTTP 200 snapshot surfaces. A snapshot route returning HTTP 200 may still be degraded; consumers must read the compatibility envelope rather than treating route mount success as readiness.

## Required FastAPI snapshot routes

The FastAPI service must expose these routes without requiring application secrets in the request so Fly health checks and NestJS startup probes can evaluate readiness:

- `GET /health`
- `GET /nestjs-handshake/snapshot`
- `GET /launch-control-manifest/snapshot`
- `GET /intelligence-startup-gate/snapshot`
- `GET /runtime-snapshot/snapshot`
- `GET /fastapi-step1-closure/snapshot`

## Compatibility envelope

Every required snapshot route must return HTTP 200 with this envelope:

```json
{
  "success": true,
  "service": "fastapi_step1_closure",
  "status": "ok",
  "ready": true,
  "timestamp": "2026-05-07T00:00:00Z",
  "blockers": [],
  "capabilities": []
}
```

Readiness is green only when `ready` is `true` and `blockers` is empty. If a snapshot cannot build, the endpoint still returns the envelope with `ready: false`, `status: "degraded"`, and actionable blocker strings.

## AI provider dependency behavior

FastAPI keeps Anthropic, OpenAI, and Gemini provider capability available through production dependencies:

- `anthropic`
- `openai`
- `google-generativeai`

Provider packages are loaded when a configured provider is instantiated. This prevents an unconfigured optional provider from crashing readiness while still reporting missing packages when a configured provider requires them.

Provider readiness semantics:

- A provider is **configured** when its API key environment variable is present.
- A provider package is **required** when that provider is configured.
- Missing package + configured provider produces a readiness blocker through the runtime dependency manifest.
- Missing package + unconfigured provider does not block core launch readiness because another configured provider or deterministic fallback paths may still operate.

## Required environment variables

Core FastAPI launch readiness requires:

- `NESTJS_BASE_URL`
- `FRONTEND_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTERNAL_SERVICE_TOKEN` (minimum 16 characters)
- `JWT_SECRET` (minimum 16 characters)

AI provider variables are optional unless that provider should be used at runtime:

- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
- `OPENAI_API_KEY`, `OPENAI_MODEL`
- `GEMINI_API_KEY`, `GEMINI_MODEL`

## Smoke validation

Use `scripts/e2e-fastapi-readiness-closure-smoke.mjs` against a running FastAPI service. It reports:

- `success`
- `blockers`
- `healthReady`
- `allRoutesMounted`
- `allRoutesHttp200`
- `readinessGreen`
- `missingDependencies`
- `degradedRoutes`
