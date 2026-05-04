# Live Commerce Flow Phase 2

## Required env vars
- `WEB_URL`
- `API_URL`
- `FASTAPI_URL`
- `MEDUSA_URL` or `MEDUSA_BACKEND_URL`
- `MEDUSA_PUBLISHABLE_KEY`
- `INTERNAL_SERVICE_TOKEN` (optional for protected API smoke routes)
- `TELEGRAM_BOT_URL`
- Web runtime: `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`

## Seed products (Medusa)
- Demo data seed: `pnpm --filter @dbaronx/medusa seed:products`
- Dry run: `pnpm --filter @dbaronx/medusa seed:products:dry-run`
- External JSON import: `pnpm --filter @dbaronx/medusa seed:products -- --file=./path/products.json`

Each seeded product must include at least one valid variant with:
- `title`
- `sku`
- `manage_inventory`
- `prices[]` (`amount`, `currency_code`)
- variant option mapping
- optional inventory level at available stock location

## Variant visibility check
1. Run product sync / mirror flow.
2. Open `/storefront-catalog`.
3. Confirm `Catalog Variants` and `Recent Variants` are non-zero when Medusa products include variants.
4. If products are visible but variant mirror is empty, UI now shows degraded reason: `products visible but variants not synced`.

## Test Medusa Store API
```bash
curl -H "x-publishable-api-key: $MEDUSA_PUBLISHABLE_KEY" "$MEDUSA_URL/store/products"
```

Verify each product has `variants[]`, and each variant has at minimum `id` plus either `prices[]` or `calculated_price` values.

## First cart readiness smoke
```bash
node scripts/e2e-cart-readiness-smoke.mjs
```

The script:
- calls `/store/products` with publishable key
- selects first product with first variant
- checks regions
- attempts cart create
- attempts add line item
- prints JSON blockers and never reports fake success

## Medusa prerequisites for cart readiness
- At least one published product with at least one variant.
- At least one region configured.
- Currency compatible with product pricing.
- Payment provider configured for region (checkout readiness).
- Shipping profile + shipping options linked to region for full checkout path.

## Existing E2E commerce smoke
```bash
node scripts/e2e-commerce-flow-smoke.mjs
```

## First-sale blocker removal (Phase 3)

### Fixed blockers targeted
- `region_missing`: use `pnpm --filter @dbaronx/medusa commerce:ensure` (or `region:ensure`) to confirm a launch region and default store region.
- `price_pending`: `commerce:ensure` inspects product variants and flags missing currency prices.
- `out_of_stock`: `commerce:ensure` checks inventory-backed variants for stock readiness.
- `supplier_na`: `commerce:ensure` validates supplier metadata presence on product/variant metadata.
- `cart_readiness`: `scripts/e2e-cart-readiness-smoke.mjs` now discovers region, creates cart, adds variant, and reports the next exact blocker.

### Commands
- `pnpm --filter @dbaronx/medusa commerce:ensure`
- `pnpm --filter @dbaronx/medusa region:ensure`
- `pnpm --filter @dbaronx/medusa shipping:ensure`

### Cart smoke usage
- `MEDUSA_BACKEND_URL=http://localhost:9000 MEDUSA_PUBLISHABLE_KEY=<pk> node scripts/e2e-cart-readiness-smoke.mjs`
- Output includes `nextBlocker` (`shipping_option_missing`, `payment_session_required`, etc.) without faking checkout success.

### Payment preflight usage
- `NESTJS_API_URL=http://localhost:4000 node scripts/e2e-payment-preflight-smoke.mjs`
- This is sandbox/test preflight only and never marks a payment as paid.

### Manual steps still needed for real first sale
- Configure live shipping provider zones/options in Medusa Admin if default/manual provider is unavailable.
- Configure real payment provider(s) and secure webhook handling in NestJS/Medusa stack.
- Validate production supplier metadata population from NestJS supplier orchestration.
- Run end-to-end checkout in a controlled staging environment before enabling real customer checkout.
