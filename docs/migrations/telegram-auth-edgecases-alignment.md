# Telegram auth/user/session edge-case alignment

## Scope
- Target: `apps/telegram-bot` only.
- Kept webhook FastAPI entrypoint and all existing command handlers unchanged.
- Preserved orchestration boundary: Telegram bot only derives actor/admin context and continues delegating business domains (identity, wallet, affiliate, orders, payments, risk) to backend APIs.

## Legacy reference availability
The requested source paths under `.dbx-source` were **not present in this workspace** during this migration:
- `.dbx-source/dbaronx_bot/src/services/auth_service.py`
- `.dbx-source/dbaronx_bot/src/services/user_service.py`
- `.dbx-source/dbaronx_bot/src/config/settings.py`

Compatibility work was therefore implemented as safe, architecture-aligned hardening based on observed current behavior.

## Decisions and compatibility added

### 1) Admin guard edge cases
- Added username-based admin allowlist parsing via `TELEGRAM_ADMIN_USERNAMES`.
- Added chat-id-based admin allowlist parsing via `TELEGRAM_ADMIN_CHAT_IDS`.
- Username normalization accepts values with/without `@` and compares case-insensitively.
- `is_admin_telegram_user` now checks, in order:
  1. Telegram user id (`TELEGRAM_ADMIN_IDS`)
  2. Telegram username (`TELEGRAM_ADMIN_USERNAMES`)
  3. Telegram chat id (`TELEGRAM_ADMIN_CHAT_IDS`)

This covers practical legacy-style operational cases where admin identity may be provisioned by username or by a dedicated admin group chat.

### 2) Actor context fallback for session continuity
- `build_actor_context` now falls back to callback-derived user/chat fields when `effective_user`/`effective_chat` are missing.
- If no user is available but chat exists, actor id falls back to chat id instead of empty string.

This avoids empty actor headers in edge updates and keeps backend audit/session traces coherent without moving business logic into Telegram.

### 3) Settings consistency
- Introduced a shared CSV parser helper for Telegram admin-related settings.
- Updated `.env.example` with new optional admin compatibility settings.

## Out-of-scope / explicitly unchanged
- No imports from `.dbx-source`.
- No transfer of auth/business logic into Telegram.
- No changes to `apps/web`, `apps/api`, `apps/services-fastapi`, or `apps/medusa`.
