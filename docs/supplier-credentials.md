# Supplier Credentials Readiness

Supplier integrations are owned by the NestJS API service. Medusa remains the commerce engine only; supplier credential validation, supplier economics, product import decisions, and supplier metadata normalization stay in the API/business orchestration layer.

## Readiness endpoint

```text
GET /api/suppliers/readiness
```

The endpoint returns secret-safe readiness only:

- `success`
- `blockers`
- `cjConfigured`
- `cjTokenPresent`
- `cjBaseUrlPresent`
- `aliexpressConfigured`
- `aliexpressAppKeyPresent`
- `aliexpressAppSecretPresent`
- `safeMode`
- `timestamp`

It never returns `CJ_ACCESS_TOKEN`, `ALIEXPRESS_APP_SECRET`, `STRIPE_SECRET_KEY`, `INTERNAL_SERVICE_TOKEN`, or private keys.

## CJ Dropshipping setup

1. Sign in to CJ Dropshipping.
2. Open **My CJ → Authorization → API → API Key**.
3. Copy the API key/token only into the Render API service environment.
4. Set the CJ API base URL on the API service.
5. Redeploy/restart the API service.
6. Run the supplier readiness smoke before attempting a real product import.

Required server-only API environment variables:

```dotenv
CJ_ACCESS_TOKEN=
CJ_API_BASE_URL=https://developers.cjdropshipping.com/api2.0
```

Current CJ preflight behavior is intentionally conservative. If `CJ_ACCESS_TOKEN` and `CJ_API_BASE_URL` are present, the readiness service reports `cj_config_present_without_live_probe` until a verified harmless CJ endpoint is added from official adapter documentation. This avoids pretending live CJ credentials were validated when no approved lightweight probe is wired.

## CJ first product import boundary

CJ import readiness requires explicit product identifiers. The API must not auto-import a massive supplier catalog.

Required input shape for the internal import-readiness boundary:

```json
{
  "cjProductId": "explicit-cj-product-id",
  "cjSku": "explicit-cj-sku",
  "costPrice": 0,
  "shippingCountries": ["US"],
  "deliveryEstimate": "supplier-provided estimate",
  "sourceUrl": "supplier product URL when available"
}
```

Normalized supplier metadata prepared by NestJS:

```json
{
  "supplier": "cj",
  "supplierProductId": "explicit-cj-product-id",
  "supplierSku": "explicit-cj-sku",
  "costPrice": 0,
  "shippingCountries": ["US"],
  "deliveryEstimate": "supplier-provided estimate",
  "sourceUrl": "supplier product URL when available"
}
```

This payload is a preview that can later seed Medusa product metadata. It does not move supplier business logic into Medusa and does not create real products by itself.

## AliExpress approved-key boundary

AliExpress stays disabled until approved official Open Platform credentials exist.

1. Open the AliExpress/Open Platform.
2. Go to **App Management → Create App**.
3. Complete the approval process for the official API use case.
4. After approval, open **Overview** and copy the **App Key** and **App Secret**.
5. Store both values only on the Render API service.
6. Redeploy/restart the API service.

Required server-only API environment variables after approval:

```dotenv
ALIEXPRESS_APP_KEY=
ALIEXPRESS_APP_SECRET=
ALIEXPRESS_API_BASE_URL=
```

The API must not scrape AliExpress, use unofficial scraping, or fake approval. If either approved credential is missing, readiness reports `aliexpress_credentials_missing`.

## Render environment placement

Store supplier secrets in **Render Dashboard → API service → Environment** only. Do not place supplier credentials on the web/frontend service, in `NEXT_PUBLIC_*` variables, in Medusa env vars, in docs with real values, or in committed `.env` files.

Server-only Render API env vars:

```dotenv
CJ_ACCESS_TOKEN=
CJ_API_BASE_URL=https://developers.cjdropshipping.com/api2.0
ALIEXPRESS_APP_KEY=
ALIEXPRESS_APP_SECRET=
ALIEXPRESS_API_BASE_URL=
INTERNAL_SERVICE_TOKEN=
```

## Smoke command

```bash
API_URL=https://api.dbaronx.com node scripts/e2e-supplier-readiness-smoke.mjs
```

When run from an environment containing `CJ_ACCESS_TOKEN`, the smoke includes the supplier readiness call in CJ preflight mode. The response must include `secretLeakDetected: false`.
