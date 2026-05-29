# Rocket Production Frontend Contract (Backend Source of Truth)

This contract defines how the separate Rocket frontend repo (`dBaronX/dbaronx`) must integrate with this backend/unified repo (`dBaronX/dbaronx-ecosystem`) for first production sale readiness.

## Public wording safety rule

- All customer-facing text must use **dBaronX** language only.
- Customer-facing UI/error copy must **not** mention internal platform/tool names (including Rocket, Supabase, Medusa, API, backend, database, table, schema, provider, framework, or build tools).
- If profile/checkout data is temporarily unavailable, show neutral wording such as: `We couldn't load your dBaronX account details right now. Please try again.`

## 1) Product display contract

- **Primary source**: `app_public.storefront_products` via backend public API (`GET /api/storefront/products` and `GET /api/storefront/products/:handle`).
- **Visibility rule**: only rows where `active = true` and `verification_status = 'verified'`.
- **Rocket-displayable fields**:
  - `id`
  - `handle`
  - `title`
  - `description`
  - `short_description`
  - `thumbnail`
  - `image_url`
  - `images`
  - `price_minor`
  - `currency_code`
  - `inventory_quantity`
  - `stock_status`
  - `delivery_estimate`
  - `supplier`
  - `supplier_product_id`
  - `supplier_sku`
  - `medusa_product_id`
  - `medusa_variant_id`
  - `checkout_enabled`
  - `metadata` **public-safe subset only**.
- **Forbidden public fields**:
  - `cost_minor`
  - `cj_raw` when unsafe/raw
  - internal notes
  - secrets/tokens/keys
- **Checkout gate on product cards/details**:
  - `checkout_enabled = true` **and** `medusa_variant_id` present, **or**
  - explicit first-sale Stripe fallback is enabled by backend/operator contract.

## 2) Supabase contract

- **Required table**: `app_public.storefront_products`.
- **RLS requirement**:
  - `anon` and `authenticated` can `SELECT` only active+verified rows.
  - `service_role` writes are server-side only.
- **Required Rocket public env**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Forbidden in Rocket browser env**:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `DATABASE_URL`
  - `CJ_ACCESS_TOKEN`
  - `CJ_API_KEY`

## 3) Checkout contract

- **Primary endpoint**: `POST /api/checkout/stripe/session`
- **Required backend base URL**:
  - `NEXT_PUBLIC_API_BASE_URL=https://dbaronx-api-unified-qo2j.onrender.com`
- **First-sale fallback payload Rocket should send**:
  - `amount`
  - `currency`
  - `productName`
  - `productId` or `handle`
  - `checkoutRef`
  - `successUrl`
  - `cancelUrl`
  - `metadataSource` or `source = dbaronx_first_sale`
  - `supplier`
  - `supplierProductId`
  - `supplierSku`
  - `handle`
- **Response shape Rocket should expect**:
  - `success`
  - `checkoutUrl`
  - `sessionId`
  - `blockers`
- **Hard rules**:
  - open Stripe only from backend-returned `checkoutUrl`
  - for the controlled first-sale product, Rocket may send `metadataSource` or `source` with `dbaronx_first_sale`
  - backend may create Stripe checkout without `medusa_variant_id` only for this controlled first-sale fallback metadata
  - never mark paid in Rocket
  - never create fake order success states
  - never mark ordered/fulfilled without verified webhook proof
  - payment proof comes from verified Stripe webhook + backend settlement status

## 4) Payment/order status contract

### Payment status endpoint (exists)

- `GET /api/checkout/stripe/settlement-status`
- Query supports: `sessionId`, `stripeEventId`, `paymentIntentId`, `chargeId`, `cartId`, `orderRef`, `checkoutRef`.
- Contract-safe response keys:
  - `success`
  - `blockers`
  - `verifiedStripeEventReady`
  - `paymentRecordReady`
  - `economicEventVerified`
  - `medusaOrderCompletionReady`
  - `medusaOrderId`
  - `settlementStatus`
  - `paymentMarkedPaid`
  - `orderSyncReady`
  - `duplicateWebhookSafe`
  - plus matched lookup IDs and durability flags.

### Order status endpoint for customer-facing support (exists, used by Telegram)

- `GET /api/orders/customer/status?reference=...`
- Rocket must treat non-proven fulfillment as support flow; no fake fulfilled/shipped states.

### Settlement storage readiness endpoint (internal/protected)

- `GET /api/checkout/stripe/settlement-storage-readiness`
- Requires internal auth guard.

### Customer-safe statuses Rocket must map to UI

- `pending_verification`
- `paid_verified`
- `not_found`
- `support_required`
- `unavailable`

### Forbidden status claims

- fake paid
- fake fulfilled
- fake shipped

## 5) Account/profile contract

- **Auth source**: Supabase Auth.
- **Profile table**: `app_public.user_profiles` (source of account display data after auth).
- **Preferred integration path**: Rocket account/profile pages read/write `app_public.user_profiles` with authenticated user sessions and RLS.
- **Fallback message when profile read/write fails**: `We couldn't update your dBaronX profile right now. Please try again.`
- **Required Rocket routes/pages**:
  - `/register`
  - `/login`
  - `/account`
  - `/profile` (alias/redirect accepted)
- **Allowed user data display**:
  - `email`
  - `full_name`/`display_name` from auth metadata or profile table
  - safe user reference
  - referral code/link only when provided by backend/Supabase
- **Forbidden**:
  - exposing service role key
  - making admin authorization decisions from user metadata alone in browser

## 6) AI Stories contract

- **Rocket customer endpoint**: `POST /api/ai-stories` (Rocket server route).
- **Request**:
  - `prompt` (required)
  - `title` (optional)
  - `genre` (optional)
  - `length` (optional)
  - `tone` (optional)
  - `language` (optional)
- **Response**:
  - `success`
  - `provider`
  - `content`
  - `story`
  - `saved`
  - `message` (on failure)
- **Rules**:
  - Rocket UI renders `data.content`
  - Rocket UI must not render `data.story` object as plain text
  - Rocket must not send `user_id="anonymous"`
  - provider keys remain server-side only

## 7) Telegram support contract

- **Rocket support link**: `https://t.me/dBaronX_bot`
- **Customer commands Rocket may show**:
  - `/shop`
  - `/products`
  - `/product <handle_or_id>`
  - `/cart_help`
  - `/checkout_help`
  - `/order_status <order_or_email_or_reference>`
  - `/payment_status <checkout_session_or_order_ref>`
  - `/support`
  - `/contact_support`
- **Rule**: do not show admin/ops commands to normal users.

## Environment contract summary

### Required Rocket public env

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Required Rocket server env

- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- AI provider key(s) used for `/api/ai-stories` (server only)

### Forbidden browser env exposure

- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `CJ_ACCESS_TOKEN`
- `CJ_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `INTERNAL_SERVICE_TOKEN`
