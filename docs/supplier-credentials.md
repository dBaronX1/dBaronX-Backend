# Supplier Credentials and First Product Import Readiness

Supplier integrations are server-only. NestJS is the supplier and business orchestration brain, while Medusa remains the commerce engine that receives already-vetted product metadata.

## Server-only Render environment variables

Set these on the **Render API/NestJS service** only. Never set supplier secrets on the web service and never prefix them with `NEXT_PUBLIC_`.

```dotenv
CJ_ACCESS_TOKEN=
CJ_API_BASE_URL=https://developers.cjdropshipping.com/api2.0
CJ_TEST_PRODUCT_ID=
CJ_TEST_SKU=
ALIEXPRESS_APP_KEY=
ALIEXPRESS_APP_SECRET=
ALIEXPRESS_API_BASE_URL=
INTERNAL_SERVICE_TOKEN=
```

Use `CJ_API_BASE_URL=https://developers.cjdropshipping.com/api2.0` for the official CJ API v2.0 base URL and keep `CJ_ACCESS_TOKEN` in the API service env only. CJ access tokens can expire or be rotated by the supplier; replace the Render API env value and redeploy whenever CJ issues a new token. `CJ_TEST_PRODUCT_ID` and `CJ_TEST_SKU` are smoke-test placeholders only and are not secrets. Use `ALIEXPRESS_API_BASE_URL` only after the approved AliExpress Open Platform app confirms the official endpoint for the approved product/API scope.

## CJ credential steps

1. Sign in to CJ Dropshipping.
2. Open **My CJ → Authorization → API → API Key**.
3. Copy the API key/access token into the Render API service as `CJ_ACCESS_TOKEN`.
4. Set `CJ_API_BASE_URL=https://developers.cjdropshipping.com/api2.0` on the same Render API service.
5. Do not put `CJ_ACCESS_TOKEN` on the web service, in frontend code, or in a `NEXT_PUBLIC_` variable.
6. Redeploy the API service so NestJS reads the new server-only environment.
7. Run the supplier readiness smoke from a secure shell that can reach the API.
8. Rotate the Render API `CJ_ACCESS_TOKEN` and redeploy before expiry or immediately after revocation/suspected exposure.

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
- `cj_base_url_missing`
- `aliexpress_credentials_missing`

When both CJ env vars exist, the API performs a harmless official CJ API v2.0 live probe with a timeout: `GET https://developers.cjdropshipping.com/api2.0/v1/product/list?pageNum=1&pageSize=1`. The only auth header is `CJ-Access-Token: <server-env-token>`, and the token is never returned or logged. Probe results are exposed only as `cjLiveProbeAttempted`, `cjLiveProbeOk`, `cjLiveProbeStatusCode`, `cjLiveProbeErrorCode`, and `cjLiveProbeErrorMessageSanitized`. Invalid/expired credentials return `cj_token_invalid_or_expired`, rate limits return `cj_rate_limited`, and network/timeouts return `cj_live_probe_unreachable`. A successful probe makes `cjConfigured: true` without any `cj_config_present_without_live_probe` blocker.

## CJ product import boundary

CJ import preparation requires an explicit product payload. The system must not auto-import a massive catalog and must not import demo/fallback products as real supplier products.

The internal boundary prepares normalized supplier metadata only:

```json
{
  "supplier": "cj",
  "productId": "explicit-cj-product-id",
  "sku": "explicit-cj-sku",
  "title": "Explicit CJ product title",
  "costPrice": 12.34,
  "currency": "USD",
  "shippingCountries": ["US"],
  "deliveryEstimate": "7-14 business days",
  "images": ["https://example.invalid/image.jpg"],
  "sourceUrl": "https://example.invalid/product",
  "rawAvailable": true
}
```

The boundary accepts `productId`/`supplierProductId` or `sku`/`supplierSku`, but it does not allow an empty request. It normalizes `supplier: "cj"`, `supplierProductId`, `supplierSku`, `title`, `costPrice`, `currency`, `shippingCountries`, `deliveryEstimate`, `images`, `sourceUrl`, and `rawAvailable`. `supplierImportReady` is true only when an explicit product id or SKU plus minimum safe economics and shipping data exist. Missing product identity returns `cj_product_id_or_sku_required`; missing price/currency returns `cj_supplier_economics_incomplete` and the more specific field blocker.

The payload can later seed Medusa product metadata through an explicit, verified import/seed path. The readiness endpoint does not create a Medusa product, does not auto-import the CJ catalog, and does not scrape CJ or AliExpress. Pricing, supplier vetting, margin policy, fulfillment decisions, and other business/economic logic stay in NestJS.

## Smoke command

```bash
API_URL=https://api.dbaronx.com \
INTERNAL_SERVICE_TOKEN= \
node scripts/e2e-supplier-readiness-smoke.mjs
```

First CJ live probe and explicit-product readiness smoke:

```bash
API_URL=https://api.dbaronx.com \
INTERNAL_SERVICE_TOKEN= \
CJ_TEST_PRODUCT_ID= \
CJ_TEST_SKU= \
node scripts/e2e-cj-live-probe-smoke.mjs
```

`CJ_TEST_PRODUCT_ID` or `CJ_TEST_SKU` enables the optional import-readiness call. Leave both empty to probe credentials only. The script prints `secretLeakDetected: false` and `sanitizedErrors: true` when API responses do not contain configured secret values or unsanitized token markers.
