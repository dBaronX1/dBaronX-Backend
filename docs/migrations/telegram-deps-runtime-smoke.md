# Telegram bot dependency + runtime smoke migration

## Scope

This migration adds pinned Python runtime dependencies for `apps/telegram-bot` and provides a repeatable smoke check that validates import/runtime bootstrap without changing handlers or business logic.

## Added dependency lock file

File: `apps/telegram-bot/requirements.txt`

Pinned runtime dependencies:

- `fastapi==0.115.12`
- `uvicorn==0.34.2`
- `python-telegram-bot==21.11.1`
- `httpx==0.27.2`
- `pydantic==2.11.4`
- `pydantic-settings==2.9.1`

## Runtime smoke procedure

From repo root:

```bash
python -m compileall apps/telegram-bot/src
python -m pip install -r apps/telegram-bot/requirements.txt
TELEGRAM_BOT_TOKEN=dummy \
NESTJS_BASE_URL=http://localhost:3001 \
FASTAPI_BASE_URL=http://localhost:8080 \
INTERNAL_SERVICE_TOKEN=dummy \
PYTHONPATH=apps/telegram-bot/src \
python -c "import main; print('import-ok')"
```

Expected outcome:

- `compileall` succeeds.
- smoke import prints `import-ok`.

## Notes

- No business logic was moved or rewritten.
- No handler deletion/moves were performed.
- No imports from `.dbx-source` were added.
