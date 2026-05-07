# Supplier Credentials and CJ Live Probe

## Server-only CJ environment

Configure these values only on the NestJS/API Render service. Never expose them to the web app, Medusa, logs, Swagger examples, screenshots, or smoke output.

```dotenv
CJ_API_BASE_URL=https://developers.cjdropshipping.com/api2.0
CJ_ACCESS_TOKEN=
INTERNAL_SERVICE_TOKEN=
CJ_TEST_PRODUCT_ID=
CJ_TEST_SKU=
```

`CJ_ACCESS_TOKEN` is sent to CJ only from the NestJS supplier adapter using the official `CJ-Access-Token` request header. It is never returned by `/api/suppliers/readiness`, never returned by `/api/v1/suppliers/cj/import-readiness`, and must not be used in frontend code.

## Official CJ docs referenced

- CJ API 2.0 overview: `https://developers.cjdropshipping.com/en/api/api2/`
- CJ Product API: `https://developers.cjdropshipping.com/en/api/api2/api/product.html`
- CJ Authentication API: `https://developers.cjdropshipping.com/en/api/api2/api/auth.html`

## Harmless CJ live-probe endpoint

The supplier readiness boundary uses the official CJ Product **Category List** endpoint:

```text
GET /api2.0/v1/product/getCategory
```

CJ documents this endpoint as “Get product categories from CJ” and shows it as a `GET` request with the `CJ-Access-Token` header. It is read-only, requires no product mutation, creates no orders, and does not add anything to My Products.

## CJ token expiry and rotation

CJ documents access tokens as 15-day credentials and refresh tokens as 180-day credentials. Treat token expiry as a production blocker because a stale token prevents live supplier lookups and controlled import-readiness.

Rotation guidance:

1. Refresh/obtain a new CJ access token through the official CJ authentication flow outside the browser.
2. Update the API service `CJ_ACCESS_TOKEN` in Render.
3. Restart/redeploy the API service so the value is loaded.
4. Run the CJ live-probe smoke before attempting product import-readiness.
5. If readiness returns `cj_token_invalid_or_expired`, rotate the token before continuing.

## Supplier readiness behavior

`GET /api/suppliers/readiness` returns sanitized status only:

- `cjConfigured`
- `cjLiveProbeAttempted`
- `cjLiveProbeOk`
- `cjLiveProbeStatusCode`
- `cjLiveProbeErrorCode`
- `cjLiveProbeErrorMessageSanitized`
- `blockers`

Blocker mapping:

- Missing token/base URL: `cj_credentials_missing`
- Invalid or expired token: `cj_token_invalid_or_expired`
- Rate limited: `cj_rate_limited`
- Timeout/network/upstream 5xx: `cj_live_probe_unreachable`
- Other non-success CJ response: `cj_live_probe_failed`

## First explicit CJ product import-readiness

The import-readiness endpoint is intentionally controlled and auditable:

```text
POST /api/v1/suppliers/cj/import-readiness
```

Request body must include exactly the product identity being evaluated:

```json
{ "productId": "CJ_PRODUCT_ID" }
```

or:

```json
{ "sku": "CJ_SKU" }
```

The endpoint does not seed Medusa, does not auto-import a catalog, and does not mark `supplierImportReady` true unless CJ data was safely retrieved and minimum normalized fields are present: supplier product ID, title, cost price, currency, and at least one image.

Normalized response shape includes:

- `supplier: "cj"`
- `supplierProductId`
- `supplierSku`
- `title`
- `costPrice`
- `currency`
- `shippingCountries`
- `deliveryEstimate`
- `images`
- `sourceUrl`
- `rawAvailable`
- `supplierImportReady`
- `medusaSeeded: false`

## Smoke commands

Readiness only:

```bash
API_URL=https://api.dbaronx.com node scripts/e2e-supplier-readiness-smoke.mjs
```

CJ live probe and optional product import-readiness:

```bash
API_URL=https://api.dbaronx.com \
INTERNAL_SERVICE_TOKEN=... \
CJ_TEST_PRODUCT_ID=... \
node scripts/e2e-cj-live-probe-smoke.mjs
```

Use `CJ_TEST_SKU` instead of `CJ_TEST_PRODUCT_ID` when validating by SKU.

## AliExpress status

AliExpress remains disabled until official API approval is granted and reviewed. Do not configure `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET`, or `ALIEXPRESS_API_BASE_URL` unless approval exists and the integration plan is explicitly authorized. Scraping AliExpress is not allowed.
