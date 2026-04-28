# FastAPI Legacy Auth and Reward Heuristics Port

## Scope
- Target: `apps/services-fastapi`
- Source references requested: `.dbx-source/FastAPI/auth.py`, `.dbx-source/FastAPI/rewards.py`
- Constraint: preserve modular FastAPI architecture and avoid runtime coupling to `.dbx-source`

## Source availability
The `.dbx-source` reference files were not present in this repository snapshot during migration execution. The migration therefore applied **compatibility-safe heuristics** inside existing modules only, based on currently deployed FastAPI interfaces.

## Auth compatibility decisions
- Extended internal auth token extraction to accept legacy-compatible token carriers in addition to the canonical `x-internal-token`:
  - `x-service-token`
  - `x-api-key`
  - `authorization: Bearer <token>`
- Added caller metadata fallbacks so older internal callers can still be attributed:
  - caller service fallback chain: `x-caller-service`, `x-service-name`, `x-service`, `x-internal-service`
  - caller surface fallback chain: `x-caller-surface`, `x-surface`
- Kept constant-time token comparison and existing authorization semantics.

## Reward/risk compatibility decisions
- Added legacy reward burst heuristic in the watch anomaly compiler using existing `raw_evidence` payload:
  - `recent_reward_attempts_10m >= 3` produces duplicate reward attempt risk signal.
- Added legacy IP rotation heuristic:
  - `distinct_ip_count_24h >= 4` combined with `ip_session_count_15m >= 4` produces an IP cluster risk signal.
- Reused existing fraud event types and modular services to avoid contract-breaking changes.

## Why this is safe
- No imports from `.dbx-source`.
- No replacement of `main.py`, routers startup plumbing, or application composition.
- Changes are isolated to existing FastAPI security dependency/validator and watch risk compiler modules.
