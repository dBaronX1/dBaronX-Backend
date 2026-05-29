# Telegram bot control surface and customer transaction path

## Live deployment port contract

Canonical Telegram bot port is **8080**.

- Fly `apps/telegram-bot/fly.toml` sets `[env] PORT = "8080"`.
- Fly `apps/telegram-bot/fly.toml` sets `[http_service].internal_port = 8080`.
- Docker exposes `8080` and starts Uvicorn with `--host 0.0.0.0 --port ${PORT:-8080}`.
- FastAPI health check path is `GET /health`.
- Readiness remains available at `GET /ready`.
- Telegram webhook path is `POST /webhook/telegram`; compatibility path `POST /webhook` remains available.

Expected public webhook URL:

```text
https://<bot-host>/webhook/telegram
```

Fly deploy command:

```bash
fly deploy --config apps/telegram-bot/fly.toml --app dbaronx-telegram-bot
```

Webhook set command after deploy and token rotation:

```bash
TELEGRAM_BOT_PUBLIC_BASE_URL=https://<bot-host> \
TELEGRAM_WEBHOOK_URL=https://<bot-host>/webhook/telegram \
node scripts/telegram-set-webhook.mjs
```

If a Telegram token appeared in logs, rotate it immediately in BotFather, replace only the runtime secret value, redeploy the bot, and re-register the webhook. Never paste token values into logs, docs, shell history, screenshots, issue comments, or smoke output.

## Deployment order after every fix

1. NestJS API
2. Medusa
3. Telegram bot
4. Web frontend
5. FastAPI only if changed

## Role split

The bot is not admin-only. Public customer commands are available to non-admin Telegram users. Admin/ops commands remain protected by `TELEGRAM_ALLOWED_ADMIN_IDS`, optional `TELEGRAM_ADMIN_USERNAMES`, optional `TELEGRAM_ADMIN_CHAT_IDS`, and optional `TELEGRAM_ADMIN_ROLES`.

### Public customer commands

- `/start`
- `/help`
- `/shop`
- `/products`
- `/product <handle_or_id>`
- `/cart_help`
- `/checkout_help`
- `/order_status <order_or_email_or_reference>`
- `/payment_status <checkout_session_or_order_ref>`
- `/support`
- `/contact_support`

Customer commands are read-only and public-safe. They may read public storefront/API status, return product/storefront links, and explain checkout/support steps. They must not expose admin readiness, internal tokens, route manifests, startup blockers, secret flags, payout queues, supplier admin data, or backend internals.

If a public product/status endpoint is missing, the bot returns a useful storefront/support fallback and a blocker such as `endpoint_not_available_yet`; it does not invent a successful product, payment, or fulfillment state.

### Protected admin/ops commands preserved

- `/status`
- `/payments_status`
- `/stripe_storage`
- `/stripe_first_tx_status`
- `/stripe_settlement`
- `/medusa_status`
- `/commerce_status`
- `/suppliers_status`
- `/dbx_status`
- `/watch_status`
- `/affiliate_status`
- `/ai_stories_status`

Additional protected diagnostics remain available for authorized operators, including `/commands`, `/health`, `/runtime`, `/launch`, `/routes`, `/env_check`, supplier readiness commands, wallet/payout read-only status commands, and AI/system readiness commands.

## 48-hour first real customer transaction path

Operational goal: produce one real customer/user transaction with proof, not broad ecosystem expansion.

Required path:

1. Store incomplete CJ data only in `DBX_FIRST_PRODUCT_MODE=draft`; publish/import one approved real supplier product through the backend/admin workflow only after image, stock, shipping country, and delivery estimate are verified.
2. Confirm Medusa/storefront can list the product through `/products` or the storefront product page.
3. Open the product page/customer bot product link.
4. Create Stripe Checkout only through the verified storefront/API checkout path.
5. Complete Stripe payment in the intended mode.
6. Verify signed Stripe webhook proof for `checkout.session.completed`.
7. Verify payment/order record proof in the backend.
8. Verify Telegram customer visibility with `/payment_status <checkout_session_or_order_ref>` and `/order_status <order_or_email_or_reference>`.
9. Verify Telegram admin visibility with `/stripe_settlement <checkout_session_id>`, `/payments_status`, and `/commerce_status`.

Safety rules:

- `/payment_status` must never claim paid unless backend proof explicitly says paid.
- `/order_status` must never claim fulfilled unless backend proof explicitly says fulfilled.
- Telegram does not open a live money override, mark payments paid, mark orders fulfilled, credit wallets/rewards, approve payouts, settle payouts, or import supplier products.

## Unsafe actions intentionally blocked

Telegram must not provide these actions:

- payout approval
- payout settlement
- wallet crediting
- reward crediting
- order fulfillment
- fake paid state
- fake fulfilled state
- supplier import mutation
- live money override

Legacy payout write commands return a blocked-action message instead of calling write endpoints.

## Validation and smoke commands

Local/static checks:

```bash
node --check scripts/e2e-telegram-bot-live-readiness-smoke.mjs
node --check scripts/e2e-telegram-customer-bot-contract-smoke.mjs
node scripts/e2e-telegram-customer-bot-contract-smoke.mjs
```

Live readiness smoke:

```bash
BOT_BASE_URL=https://<bot-host> \
API_BASE_URL=https://<api-host> \
MEDUSA_BASE_URL=https://<medusa-host> \
node scripts/e2e-telegram-bot-live-readiness-smoke.mjs
```

The live readiness smoke accepts `API_BASE_URL` or `API_URL`, `MEDUSA_BASE_URL` or `MEDUSA_URL`, and `BOT_BASE_URL`, `BOT_PUBLIC_BASE_URL`, or `TELEGRAM_BOT_PUBLIC_BASE_URL`. It prints attempted API, bot, FastAPI, and Medusa paths with HTTP statuses. It does not require `TELEGRAM_BOT_TOKEN` in the local shell when deployed `/ready` confirms the Telegram runtime is configured server-side. It redacts known token/key shapes and configured secret values.

First transaction combined smoke:

```bash
BOT_BASE_URL=https://<bot-host> \
API_BASE_URL=https://<api-host> \
MEDUSA_BASE_URL=https://<medusa-host> \
MEDUSA_PUBLISHABLE_KEY= \
INTERNAL_SERVICE_TOKEN= \
node scripts/e2e-first-transaction-with-telegram-ops-smoke.mjs
```

Do not print the actual publishable/internal secret values in logs or tickets.

## Customer Telegram flow after product-discovery hardening

The customer bot now guides a public Telegram user from discovery to the canonical web checkout path without introducing Telegram-side money or fulfillment writes.

1. Customer sends `/shop`.
   - Bot returns the storefront URL.
   - Bot returns the product listing URL.
   - Bot tells the user to run `/products` for a Telegram-readable catalog preview.
   - Bot returns `/contact_support` and the storefront support fallback.
2. Customer sends `/products`.
   - Bot reads public products from the Medusa Store API (`GET /store/products`, maximum five items for Telegram readability).
   - Each item includes title, public price when exposed, availability guidance, and a product URL.
   - Customer `/products` shows only products with `supplierVerificationStatus: "verified_for_checkout"`, `realSupplierProduct: true`, and `demo: false`. If only supplier drafts exist, customers see `real_supplier_product_missing` plus `Supplier draft — not ready for checkout` instead of fake readiness. Admin context may see draft rows labeled `Supplier draft — not ready for checkout`.
3. Customer sends `/product <handle_or_id>`.
   - Bot looks up the product by direct Store API product path and by handle-filtered listing.
   - Bot returns title, price, availability hint, supplier/public metadata hint, product URL, and checkout URL.
   - If the product is not found, the bot returns `not_found`, a storefront lookup URL, and next actions.
4. Customer opens the product URL in the web storefront.
5. Customer completes cart and checkout only through the storefront and Stripe-hosted checkout.
6. Backend verifies signed Stripe webhook proof before any payment is treated as paid.
7. Customer can use `/payment_status <checkout_session_or_order_ref>` or `/order_status <order_or_email_or_reference>` for safe read-only status guidance.

### Product discovery flow

Product discovery is public-read only and source-backed:

- Primary source: Medusa Store API `GET /store/products`.
- Product detail lookup: `GET /store/products/<handle_or_id>` and `GET /store/products?handle=<handle>&limit=1`.
- Telegram output limit: three to five products; current cap is five.
- Product URL shape: `<WEB_BASE_URL>/products/<handle_or_id>`.
- Price is displayed only when the public product payload exposes price data.
- Availability is displayed only as public-safe storefront/inventory guidance; Telegram never invents supplier stock.
- Supplier is displayed only when public product metadata provides a supplier/source signal.
- Demo/sample/mock products are labeled `DEMO`, and CJ/supplier drafts are labeled `Supplier draft — not ready for checkout`. Both block first-real-checkout readiness with `real_supplier_product_missing`; only `verified_for_checkout` products are customer-checkout candidates.

### What customers can do in Telegram

Customers can:

- Find the storefront and product listing with `/shop`.
- Preview public products with `/products`.
- Inspect a specific public product with `/product <handle_or_id>`.
- Learn the cart and checkout path with `/cart_help` and `/checkout_help`.
- Request safe status guidance with `/payment_status <checkout_session_or_order_ref>`.
- Request safe order-support guidance with `/order_status <order_or_email_or_reference>`.
- Get support instructions with `/support` or `/contact_support`.

Customers cannot use Telegram to create carts, create live checkout sessions directly, settle payments, mark orders paid, mark orders fulfilled, reserve stock, credit wallets/rewards, approve payouts, settle payouts, or mutate supplier imports.

### What only web checkout can do

Only the web storefront checkout path can:

- Build the canonical customer cart.
- Show final storefront availability, shipping, tax, and total price.
- Redirect to Stripe-hosted checkout.
- Return the Stripe Checkout Session ID/order reference the customer can later provide for support/status lookup.

Telegram remains a read-only guide into that path.

### What only signed webhook proof can prove

Only the backend processing a valid signed Stripe webhook can prove payment. Customer Telegram status is constrained to these safe statuses:

- `pending_verification`
- `paid_verified`
- `not_found`
- `support_required`

The bot never maps a user-supplied reference, redirect URL, browser success page, or unsigned webhook attempt to paid. `/payment_status` may say `paid_verified` only when the backend settlement-status endpoint reports verified Stripe event proof and a payment record. `/order_status` does not claim customer fulfillment; when a public order-status endpoint is unavailable or insufficient, it returns support guidance.

### First real transaction checklist

Before inviting the first real customer to pay real money:

- [ ] Publish/import at least one approved real supplier product outside Telegram.
- [ ] Confirm Medusa Store API lists that product through `GET /store/products`.
- [ ] Confirm `/products` labels no real supplier blockers for that item.
- [ ] Confirm `/product <handle_or_id>` returns price/availability/product URL and does not label the item DEMO.
- [ ] Confirm web product page can add the item to cart.
- [ ] Confirm web checkout redirects to Stripe-hosted checkout in the intended mode.
- [ ] Confirm unsigned Stripe webhook requests are rejected.
- [ ] Confirm signed `checkout.session.completed` webhook evidence is persisted.
- [ ] Confirm `/payment_status <checkout_session_or_order_ref>` returns `paid_verified` only after backend proof.
- [ ] Confirm `/order_status <order_or_email_or_reference>` sends customers to support rather than faking fulfillment when public proof is unavailable.
- [ ] Confirm admin/ops diagnostics remain protected from non-admin Telegram users.

### Deployment order after this change

1. Deploy the NestJS API so settlement-status behavior is available.
2. Deploy/restart Medusa so the public Store API reflects the approved supplier product.
3. Deploy the Telegram bot so `/shop`, `/products`, `/product`, `/checkout_help`, `/payment_status`, and `/order_status` use the hardened customer flow.
4. Deploy the web frontend so product pages and checkout guidance match the bot links.
5. Run the customer first-checkout smoke and the live first-transaction smoke before sending a real customer to checkout.

Validation command for the customer journey smoke:

```bash
node scripts/e2e-telegram-customer-first-checkout-journey-smoke.mjs
```

## First real supplier product discovery behavior

Telegram customer discovery now treats `metadata.realSupplierProduct: true` with `metadata.demo: false` as the public-safe signal that a product is not a demo, provided supplier/source metadata is also present. The same product should expose safe metadata fields such as `supplier`, `supplierProductId`, `supplierSku`, and `sourceUrl` in Medusa metadata, but Telegram only prints customer-safe supplier hints and product/storefront URLs.

Customer-visible behavior:

- `/products` labels demo/sample/mock/test products as `DEMO` and returns `real_supplier_product_missing` when no real supplier product is visible.
- `/products` includes price, availability guidance, safe supplier hint, and product URL for listed products.
- `/product <handle_or_id>` suppresses the `DEMO` label for a product that carries the first-real-product metadata contract and keeps showing the storefront product URL and checkout URL.
- Telegram remains read-only: it does not create carts, create checkout sessions, mutate supplier imports, write money state, credit wallets/rewards, approve payouts, mark orders paid, or mark orders fulfilled.

Run the first real product smoke before sending customers to checkout:

```bash
MEDUSA_BASE_URL=https://<medusa-host> \
MEDUSA_PUBLISHABLE_KEY=<publishable key if required> \
WEB_BASE_URL=https://<web-host> \
pnpm first-product:readiness
```

## Manual CJ first-product checklist

For the first real customer transaction, Telegram may only verify discovery/status guidance for a manually selected CJ product that has already been seeded into Medusa. Telegram must not scrape CJ, bulk import CJ products, call supplier-write endpoints, create checkout sessions, mark payments paid, fulfill orders, credit wallets, or approve payouts.

Required CJ/manual inputs before running Telegram discovery:

- [ ] CJ product title
- [ ] CJ product ID
- [ ] CJ SKU
- [ ] CJ source URL (`http://` or `https://` only)
- [ ] Product image URL (`http://` or `https://` only)
- [ ] Supplier cost in USD minor units (`DBX_FIRST_PRODUCT_COST_USD_MINOR=419` for the selected CJ product)
- [ ] Selling price (`DBX_FIRST_PRODUCT_PRICE_USD_MINOR=1999` for the selected first CJ shirt unless an operator-approved margin-safe price replaces it)
- [ ] Stock quantity
- [ ] Shipping country
- [ ] Margin note reviewed outside Telegram; internal supplier cost/margin is never printed to customers

Expected Medusa metadata contract for Telegram to classify the product as real:

```json
{
  "supplier": "cj",
  "supplierProductId": "<CJ product ID>",
  "supplierSku": "<CJ SKU>",
  "sourceUrl": "<CJ source URL>",
  "supplierCostAmount": 419,
  "supplierCostCurrency": "usd",
  "realSupplierProduct": true,
  "demo": false
}
```

Seed command:

```bash
DBX_FIRST_PRODUCT_TITLE='<CJ product title>' \
DBX_FIRST_PRODUCT_HANDLE='<customer-safe-handle>' \
DBX_FIRST_PRODUCT_DESCRIPTION='<customer-safe description>' \
DBX_FIRST_PRODUCT_PRICE_USD_MINOR='1999' \
DBX_FIRST_PRODUCT_COST_USD_MINOR='419' \
DBX_FIRST_PRODUCT_SUPPLIER='cj' \
DBX_FIRST_PRODUCT_SUPPLIER_PRODUCT_ID='2408300732091605000' \
DBX_FIRST_PRODUCT_SUPPLIER_SKU='CJDS212420104DW' \
DBX_FIRST_PRODUCT_SOURCE_URL='https://cjdropshipping.com/product/new-mens-casual-blouse-cotton-linen-shirt-loose-tops-long-sleeve-tee-shirt-spring-autumn-casual-handsome-mens-shirts-p-2408300732091605000.html' \
DBX_FIRST_PRODUCT_IMAGE_URL='<https://...>' \
DBX_FIRST_PRODUCT_STOCK_QTY='<positive stock quantity>' \
pnpm first-product:seed
```

Readiness command:

```bash
EXPECT_SUPPLIER=cj \
MEDUSA_BASE_URL=https://dbaronx-medusa.onrender.com \
WEB_BASE_URL=https://dbaronx.com \
MEDUSA_PUBLISHABLE_KEY='<publishable key if required>' \
pnpm first-product:readiness
```

Telegram test commands:

```text
/shop
/products
/product <handle_or_id>
/checkout_help
/payment_status <checkout_session_or_order_ref>
/order_status <order_or_email_or_reference>
/support
```

## First-sale closure gate for Telegram-controlled launch

Before Telegram is used as the control/distribution surface for a real customer, run the final first-sale readiness closure. This does not let Telegram mutate commerce state; it proves the deployed web, Medusa Store API, selected CJ product, cart/add-to-cart path, shipping options, Node runtime, Redis production configuration, session-store production safety, and optional Telegram/Stripe proof flags are ready.

Required real product values remain:

```bash
DBX_FIRST_PRODUCT_MODE=publish
DBX_FIRST_PRODUCT_TITLE='<customer-safe product title>'
DBX_FIRST_PRODUCT_HANDLE='<customer-safe product handle>'
DBX_FIRST_PRODUCT_DESCRIPTION='<customer-safe product description>'
DBX_FIRST_PRODUCT_PRICE_USD_MINOR='1999'
DBX_FIRST_PRODUCT_COST_USD_MINOR='419'
DBX_FIRST_PRODUCT_SUPPLIER='cj'
DBX_FIRST_PRODUCT_SUPPLIER_PRODUCT_ID='2408300732091605000'
DBX_FIRST_PRODUCT_SUPPLIER_SKU='CJDS212420104DW'
DBX_FIRST_PRODUCT_SOURCE_URL='https://cjdropshipping.com/product/new-mens-casual-blouse-cotton-linen-shirt-loose-tops-long-sleeve-tee-shirt-spring-autumn-casual-handsome-mens-shirts-p-2408300732091605000.html'
DBX_FIRST_PRODUCT_IMAGE_URL='<approved https product image url>'
DBX_FIRST_PRODUCT_STOCK_QTY='<confirmed stock quantity greater than zero>'
DBX_FIRST_PRODUCT_SHIPPING_COUNTRIES='US'
DBX_FIRST_PRODUCT_DELIVERY_ESTIMATE='<confirmed customer-safe delivery estimate>'
```

Final seed command:

```bash
DBX_FIRST_PRODUCT_MODE=publish \
DBX_FIRST_PRODUCT_TITLE="Men's Cotton Linen Long Sleeve Casual Shirt" \
DBX_FIRST_PRODUCT_HANDLE="mens-cotton-linen-long-sleeve-casual-shirt" \
DBX_FIRST_PRODUCT_DESCRIPTION="<customer-safe product description>" \
DBX_FIRST_PRODUCT_PRICE_USD_MINOR="1999" \
DBX_FIRST_PRODUCT_COST_USD_MINOR="419" \
DBX_FIRST_PRODUCT_SUPPLIER="cj" \
DBX_FIRST_PRODUCT_SUPPLIER_PRODUCT_ID="2408300732091605000" \
DBX_FIRST_PRODUCT_SUPPLIER_SKU="CJDS212420104DW" \
DBX_FIRST_PRODUCT_SOURCE_URL="https://cjdropshipping.com/product/new-mens-casual-blouse-cotton-linen-shirt-loose-tops-long-sleeve-tee-shirt-spring-autumn-casual-handsome-mens-shirts-p-2408300732091605000.html" \
DBX_FIRST_PRODUCT_IMAGE_URL="https://<approved product image url>" \
DBX_FIRST_PRODUCT_STOCK_QTY="<confirmed stock quantity greater than zero>" \
DBX_FIRST_PRODUCT_SHIPPING_COUNTRIES="US" \
DBX_FIRST_PRODUCT_DELIVERY_ESTIMATE="<confirmed customer-safe delivery estimate>" \
pnpm first-product:seed
```

Final deployed readiness command:

```bash
FIRST_SALE_PRODUCTION_READINESS=true \
EXPECT_SUPPLIER=cj \
MEDUSA_BASE_URL=https://dbaronx-medusa.onrender.com \
WEB_BASE_URL=https://dbaronx.com \
MEDUSA_PUBLISHABLE_KEY='<publishable key if required>' \
REDIS_URL='<Render Redis/Key Value internal URL or equivalent>' \
MEDUSA_PRODUCTION_SESSION_STORE_READY='<true only after a production-safe Medusa session store is configured/proven>' \
TELEGRAM_READINESS_REQUIRED=true \
BOT_PUBLIC_BASE_URL='<deployed Telegram bot public base URL>' \
pnpm first-sale:readiness
```

No-go before sending a real customer through Telegram:

- final closure `success` is not `true` or any blocker remains;
- the CJ product image URL, positive stock quantity, supported shipping country, or customer-safe delivery estimate is missing;
- `realSupplierProduct` is not true or supplier blockers remain;
- Node production runtime is not Node 20 (`>=20 <21`);
- Redis production readiness is not proven with real `REDIS_URL`/equivalent;
- Medusa session-store production safety is not proven (`MEDUSA_PRODUCTION_SESSION_STORE_REQUIRED` remains a launch blocker);
- Stripe test checkout, signed webhook, and durable order/payment proof are incomplete;
- Telegram customer first-checkout journey and first-transaction-with-ops smokes have not passed against deployed URLs.

## First-sale security ladder for Telegram control surface

Telegram remains the control/distribution surface, not the risk engine or economic brain. The first controlled sale keeps buyer checkout low-friction while protecting operator actions through existing admin/internal controls.

### Current provider contract

FastAPI performs server-side CAPTCHA verification. hCaptcha is the existing provider and remains valid for the first sale. Turnstile may be used as optional primary bot protection if configured.

```bash
HCAPTCHA_SECRET=
TURNSTILE_SECRET_KEY=
TURNSTILE_SITE_KEY=
CAPTCHA_PRIMARY=hcaptcha
CAPTCHA_FALLBACK=turnstile
CAPTCHA_REQUIRED_FOR_CHECKOUT=false
CAPTCHA_REQUIRED_FOR_WATCH_REWARD=true
MFA_REQUIRED_FOR_ADMIN=true
PASSKEYS_ENABLED=false
```

Provider selection is environment-driven. Do not require both Turnstile and hCaptcha for every normal action. If Turnstile is not configured, hCaptcha can still satisfy the first-sale security requirement. If checkout CAPTCHA is explicitly required and both providers are missing, readiness must block with `CAPTCHA_PROVIDER_REQUIRED`.

### Telegram action ladder

- Public discovery commands such as `/shop`, `/products`, and `/product` stay public-read and customer-safe.
- Normal buyer first checkout must not require passkeys or TOTP yet.
- Watch/ad reward confirmation remains CAPTCHA-gated through FastAPI/NestJS orchestration before economic reward decisions.
- Admin/operator commands must continue to use existing Telegram admin IDs, roles, internal service tokens, and read-only/blocking behavior for unsafe mutations.
- Payout, wallet, supplier admin, advertiser funding, DBX token, crowdfunding, and destructive actions are phase-two MFA/passkey step-up candidates; do not mark them production-ready until real code/config/tests exist.

### No-go conditions

- Telegram must not approve payouts, credit wallets/rewards, mark payments paid, mark orders fulfilled, import supplier products, or override live money state.
- Telegram must not expose secrets or print configured token values in logs, docs, fixtures, or smoke output.
- Telegram must not force passkeys/TOTP onto a normal buyer checkout before the first controlled sale.

### Phase two after first sale

Implement real passkey plus authenticator/TOTP step-up for high-risk and critical operator actions after the first controlled sale. Until then, readiness should surface `MFA_PASSKEY_REQUIRED_FOR_ADMIN_PHASE_TWO` as a warning and keep the existing admin/internal protections in force.

## Render-safe CJ first-shirt seed and Telegram discovery closure

The first customer-facing Telegram discovery path expects the selected CJ shirt to be seeded in Medusa with `handle=mens-cotton-linen-long-sleeve-casual-shirt`, `supplierProductId=2408300732091605000`, and `supplierSku=CJDS212420104DW`. Telegram remains read-only: it may discover the product and guide the customer to web checkout, but it must not seed products, create carts, create checkout sessions, mark paid, fulfill, or mutate supplier state.

Do not seed from a laptop with Render's internal `DATABASE_URL`. Use Render's Medusa service Start Command for a one-time seed, then restore the normal command:

```bash
DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa run first-product:seed:cj-shirt && pnpm --filter @dbaronx/medusa run start
```

Restore immediately after the seed succeeds:

```bash
pnpm --filter @dbaronx/medusa run start
```

Then verify customer discovery and visible-checkout readiness:

```bash
EXPECT_SUPPLIER=cj MEDUSA_BASE_URL=https://dbaronx-medusa.onrender.com WEB_BASE_URL=https://dbaronx.com pnpm first-product:readiness
DBX_FIRST_CJ_VISIBLE_SMOKE_LIVE=true EXPECT_SUPPLIER=cj MEDUSA_BASE_URL=https://dbaronx-medusa.onrender.com WEB_BASE_URL=https://dbaronx.com MEDUSA_PUBLISHABLE_KEY='<full publishable key>' pnpm first-product:visible-checkout
```

The readiness smoke reports old demo products separately from the verified CJ shirt. Demo products may still exist during cleanup, but they must not be relabeled as real and must not block readiness when the exact verified CJ product is present and customer-checkout-ready. Telegram `/products` and `/product mens-cotton-linen-long-sleeve-casual-shirt` should show the verified CJ shirt as customer-safe, not `DEMO` or `Supplier draft — not ready for checkout`.

First transaction smoke order before inviting a real customer:

1. `pnpm first-product:readiness`
2. `pnpm first-product:visible-checkout` (or the live form shown above)
3. `pnpm first-sale:readiness`
4. `node scripts/e2e-telegram-customer-first-checkout-journey-smoke.mjs`
5. `node scripts/e2e-first-transaction-with-telegram-ops-smoke.mjs`
6. `node scripts/e2e-first-stripe-test-transaction-smoke.mjs`

Rotate any database password or other production credential that was copied into a laptop terminal, chat, support ticket, or log while attempting the seed.

## Post-seed Telegram customer verification commands

After the CJ shirt seed is visible in Medusa and the storefront is deployed, verify the Telegram customer surface with customer-safe commands only:

1. `/shop` should return the storefront URL, product listing URL, and explain that checkout happens through the dBaronX storefront and Stripe-hosted payment.
2. `/products` should list `Men's Cotton Linen Long Sleeve Casual Shirt` as a verified real supplier product, not `DEMO` and not `Supplier draft — not ready for checkout`.
3. `/product mens-cotton-linen-long-sleeve-casual-shirt` should show the product title, public price, CJ supplier hint, product URL, checkout URL/guidance, and only a safe public supplier source URL.
4. `/checkout_help` should describe the safe path: Telegram discovery → product page → web checkout → Stripe-hosted checkout → signed webhook → order confirmation.
5. `/payment_status <checkout_session_or_order_ref>` must return `paid_verified` only when backend settlement proof says paid; otherwise it remains `pending_verification`, `not_found`, or `support_required`.
6. `/order_status <order_or_email_or_reference>` must not claim fulfilled unless backend order proof says fulfilled; current customer copy stays conservative and does not expose admin internals.
7. Admin/ops diagnostics such as `/env_check`, `/runtime`, `/routes`, supplier readiness, wallet, payout, and Stripe settlement commands remain protected by the admin guard and are not part of customer discovery.

Telegram remains read-only for customers. It must never mark paid, mark fulfilled, create fake stock, create fake supplier metadata, credit wallets/rewards, approve payouts, import supplier products, expose secrets, or bypass the Stripe signed-webhook proof requirement. CJ bulk automation continues separately with rate-limit-safe small previews (`category=fashion`, `limitPerCategory=5`, `dryRun=true`); Telegram should only display the controlled shirt after it is present in the Medusa-backed public catalog as `verified_for_checkout`.
