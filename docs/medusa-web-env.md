# Web ↔ Medusa environment contract

Required frontend environment variables:

- `NEXT_PUBLIC_MEDUSA_BACKEND_URL` (example: `https://medusa.your-domain.com`)
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` (Medusa publishable store key)

## Create/retrieve publishable key

Run from repo root:

```bash
pnpm --filter @dbaronx/medusa key:publishable
```

This prints JSON containing `publishableKey`.
