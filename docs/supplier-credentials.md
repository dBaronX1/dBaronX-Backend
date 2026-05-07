# Supplier Credentials and First Product Import Readiness

Supplier integrations are server-only. NestJS is the supplier and business orchestration brain, while Medusa remains the commerce engine that receives already-vetted product metadata.

## Server-only Render environment variables

Set these on the **Render API/NestJS service** only. Never set supplier secrets on the web service and never prefix them with `NEXT_PUBLIC_`.

```dotenv
CJ_ACCESS_TOKEN=
CJ_API_BASE_URL=
ALIEXPRESS_APP_KEY=
ALIEXPRESS_APP_SECRET=
ALIEXPRESS_API_BASE_URL=
INTERNAL_SERVICE_TOKEN=
```

Use `CJ_API_BASE_URL` for the approved CJ API base URL and keep the access token in the API service env only. Use `ALIEXPRESS_API_BASE_URL` only after the approved AliExpress Open Platform app confirms the official endpoint for the approved product/API scope.

## CJ credential steps

1. Sign in to CJ Dropshipping.
2. Open **My CJ → Authorization → API → API Key**.
3. Copy the API key/access token into the Render API service as `CJ_ACCESS_TOKEN`.
4. Set `CJ_API_BASE_URL` on the same Render API service.
5. Redeploy the API service so NestJS reads the new server-only environment.
6. Run the supplier readiness smoke from a secure shell that can reach the API.

## AliExpress approved API steps

1. Sign in to the AliExpress Open Platform.
2. Open **Open Platform → App Management → Create App**.
3. Complete app details and submit the app for approval.
4. Wait for approval before enabling AliExpress operations.
5. After approval, open the app **Overview** and copy the **App Key** and **App Secret**.
6. Store `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET`, and the approved official `ALIEXPRESS_API_BASE_URL` on the Render API service only.

AliExpress remains disabled until approved platform credentials exist. The repository must not scrape AliExpress and must not use unofficial scraping endpoints.

## Readiness endpoint

The internal readiness endpoint is:

```text
GET /api/suppliers/readiness
```

It reports `success`, `blockers`, supplier configuration booleans, `safeMode`, and a timestamp. It never returns access tokens, app secrets, private keys, or raw supplier credentials.

Expected blockers before credentials are configured include:

- `cj_access_token_missing`
- `cj_api_base_url_missing`
- `aliexpress_credentials_missing`

When CJ credentials are present but the adapter has no verified harmless official live-probe endpoint, readiness returns `cj_config_present_without_live_probe` instead of pretending the live credential has been validated.

## CJ product import boundary

CJ import preparation requires an explicit product payload. The system must not auto-import a massive catalog and must not import demo/fallback products as real supplier products.

The internal boundary prepares normalized supplier metadata only:

```json
{
  "supplier": "cj",
  "supplierProductId": "explicit-cj-product-id",
  "supplierSku": "explicit-cj-sku",
  "costPrice": 12.34,
  "shippingCountries": ["US"],
  "deliveryEstimate": "7-14 business days",
  "sourceUrl": "https://example.invalid/product"
}
```

The payload can later seed Medusa product metadata. Pricing, supplier vetting, margin policy, fulfillment decisions, and other business/economic logic stay in NestJS.

## Smoke command

```bash
API_URL=https://api.dbaronx.com \
INTERNAL_SERVICE_TOKEN= \
node scripts/e2e-supplier-readiness-smoke.mjs
```

If `CJ_ACCESS_TOKEN` exists in the smoke environment, the script also calls the CJ preflight endpoint. The script prints `secretLeakDetected: false` when the API responses do not contain configured secret values.
