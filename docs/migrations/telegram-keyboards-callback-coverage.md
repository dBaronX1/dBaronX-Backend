# Telegram Legacy Keyboard and Callback Coverage Recovery

## Scope
- Repository: `dbaronx-ecosystem`
- Target: `apps/telegram-bot`
- Base architecture preserved: webhook-first Telegram bot with command/callback handlers delegating business logic to NestJS/FastAPI services.

## Source reference availability
Requested source references were checked at:
- `.dbx-source/dbaronx_bot/src/core/keyboards.py`
- `.dbx-source/dbaronx_bot/src/handlers/callbacks.py`
- `.dbx-source/dbaronx_bot/src/core/commands.py`

Those files were not present in this workspace, so migration decisions were made from the current Telegram bot command and callback topology.

## Migration decisions

### 1) Expanded admin keyboard callback coverage
Added callback buttons that route administrators to existing command surfaces without replacing existing handlers:
- `admin:ops` -> `/ops`
- `admin:admin_summary` -> `/admin_summary`
- `admin:launch_audit` -> `/launch_audit`
- `admin:commands` -> `/commands`
- `admin:help` -> `/help`
- `admin:telegram_closure` -> `/telegram_closure`
- `admin:telegram_handoff` -> `/telegram_handoff`

Rationale: recover legacy-style discoverability through inline keyboards while preserving command handler ownership and external service delegation.

### 2) Expanded ops keyboard callback coverage
Added ops shortcut callbacks to existing commands:
- `ops:ops_pack` -> `/ops_pack`
- `ops:commands` -> `/commands`
- `ops:help` -> `/help`

Rationale: increase callback coverage without introducing Telegram-local business logic.

### 3) No architecture replacement
- No changes to FastAPI entrypoint.
- No business logic moved into Telegram callbacks.
- Existing command handlers retained.
- No imports from `.dbx-source`.

## Validation performed
- Python compile check for Telegram app source.
- Repo tracked-file check for `.dbx-source`.
