# Live Commerce Flow Phase 2

## Required env vars
- `WEB_URL`
- `API_URL`
- `FASTAPI_URL`
- `MEDUSA_URL`
- `MEDUSA_PUBLISHABLE_KEY`
- `INTERNAL_SERVICE_TOKEN` (optional for protected API smoke routes)
- `TELEGRAM_BOT_URL`
- Web runtime: `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`

## Seed products (Medusa)
- Demo data seed: `pnpm --filter @dbaronx/medusa seed:products`
- Dry run: `pnpm --filter @dbaronx/medusa seed:products:dry-run`
- External JSON import: `pnpm --filter @dbaronx/medusa seed:products -- --file=./path/products.json`

Supported fields: title, description, handle, thumbnail/images, category/collection mapping metadata, variant title, SKU, price amount, currency, inventory quantity, supplier reference metadata, delivery metadata, eco tags.

## Test product loading in Web
1. Set `NEXT_PUBLIC_MEDUSA_BACKEND_URL` and `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.
2. Open `/storefront-catalog`.
3. Verify title, price, handle, variant id, stock fallback, supplier metadata and image fallback rows render.
4. If no products are returned, Web shows **Products coming soon** state.

## Test Medusa Store API
```bash
curl -H "x-publishable-api-key: $MEDUSA_PUBLISHABLE_KEY" "$MEDUSA_URL/store/products"
```

## Run E2E commerce smoke
```bash
node scripts/e2e-commerce-flow-smoke.mjs
```

## Manual items remaining
- Real supplier master data and live supplier integration credentials.
- Real payment provider credentials and production checkout completion wiring.
- Real delivery/fulfillment commercial terms.
- Real product image, pricing, and stock sources.
