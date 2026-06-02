# dBaronX Production Lock State

Latest audited commit before this lock restore: `0a7041f` (`Merge pull request #48 from dBaronX1/codex/fix-checkout-and-login-issues`).

## Milestone restoration map

| Milestone | Locked production contract | Lock smoke |
| --- | --- | --- |
| Auth readiness/register/login/logout/me/password reset | API gateway routes remain public-safe, registration creates Auth user and safe profile, login returns a usable API token, owner bootstrap remains guarded. | `scripts/e2e-auth-profile-production-lock-smoke.mjs` |
| Auth DB trigger diagnostics | Diagnostic and repair SQL stay in `supabase/sql/diagnostics/auth_user_creation_diagnostic.sql` and `supabase/sql/repairs/auth_user_creation_safe_repair.sql`. | `scripts/e2e-auth-profile-production-lock-smoke.mjs` |
| Profile UI | Hydrates via API session, never renders raw metadata or provider internals, includes photo picker/preview, full name, email, phone, country, phone code, language, gender, pronouns, referral link. | `scripts/e2e-auth-profile-production-lock-smoke.mjs` |
| Catalog/shop/product detail | Frontend calls API catalog only; backend normalizes products with `imageUrl`, `thumbnail`, `images`, price, variant, buyable state, delivery, and safe public labels. | `scripts/e2e-shop-products-production-lock-smoke.mjs` |
| Product images | Primary image preference is `imageUrl || image_url || image || images[0].url || thumbnail`; cards use high-quality responsive image rendering. | `scripts/e2e-shop-products-production-lock-smoke.mjs` |
| Cart selected checkout | Local cart key remains `dbx_local_cart_v1`; items include image, prices, quantity, selected state; unselected items remain in cart. | `scripts/e2e-cart-checkout-production-lock-smoke.mjs` |
| Checkout/session | Frontend sends selected `lineItems`, customer, shipping address, provider alias, source, and total; backend accepts Stripe/Paystack hosted checkout only and never marks paid on creation. | `scripts/e2e-cart-checkout-production-lock-smoke.mjs` |
| Payment mode | Test/sandbox keys win by default; live fallback is allowed when only live keys exist; live override while test keys exist requires `DBX_ALLOW_LIVE_CHECKOUT=true`. | `scripts/e2e-payment-mode-resolution-smoke.mjs` |
| Orders/payment status | Success/cancel/status pages never mark paid; signed webhooks remain the source of `paid_verified`. | `scripts/e2e-order-payment-status-lock-smoke.mjs` |
| AI Stories | Frontend calls NestJS route; NestJS calls FastAPI `/ai/stories/*`; FastAPI supports provider key aliases and readiness/generate routes; no fake output. | `scripts/e2e-ai-stories-production-lock-smoke.mjs` |
| Public wording | Customer UI does not expose public platform/vendor/source labels or raw backend/internal errors. | `scripts/e2e-no-public-third-party-leaks-smoke.mjs`, `scripts/e2e-no-secret-no-raw-error-lock-smoke.mjs` |
| Full lock | Aggregates all focused production lock smokes. | `scripts/e2e-dbx-full-production-lock-smoke.mjs` |

## Payment mode behavior

Stripe and Paystack now resolve keys deterministically:

1. `*_TEST_SECRET_KEY` wins.
2. `*_SECRET_KEY=sk_test_*` wins next.
3. `*_LIVE_SECRET_KEY` is used only when no test key is present.
4. `*_SECRET_KEY=sk_live_*` is used as live fallback.
5. `DBX_PAYMENT_MODE=live` while any test key exists is blocked unless `DBX_ALLOW_LIVE_CHECKOUT=true`.

Readiness returns safe booleans and modes only; no key values are logged or returned.

## Manual tests after deploy

1. Visit `/register`, create a test account, verify a safe success or safe account-service error.
2. Visit `/login`, sign in, and verify `/profile` hydrates safely.
3. Visit `/shop`, confirm product cards show high-quality images and safe supplier labels only.
4. Add two products to cart, unselect one, verify selected subtotal and checkout selected only.
5. Complete checkout shipping details, test Card Payment hosted checkout, and confirm the success page does not mark paid.
6. Repeat checkout with Mobile Money / Local Payment.
7. Visit `/payment-status` and `/orders` with a test reference after webhook settlement.
8. Generate each locked story concept and verify failure copy is safe if providers are unavailable.
