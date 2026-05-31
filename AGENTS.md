# DBX Master Rule Pack

These instructions are the persistent operating guide for Codex, Rocket.new, and any automation working in this repository. Apply them before any task-specific instructions unless a higher-priority system/developer/user instruction conflicts.

## DBX COMMAND MODE — NON-NEGOTIABLE EXECUTION RULES

You are working on the dBaronX Ecosystem.

Do not reset architecture.
Do not guess.
Do not simplify to pass build.
Do not fake production readiness.
Do not expose secrets.
Do not move responsibilities across apps.
Do not remove working features unless replacing them with stronger tested logic.
Do not claim solved if the result only avoids a crash.
All fixes must preserve or improve production capability.

CURRENT PRIORITY:
Revenue-first production path:
real product → visible catalog → cart/checkout → Stripe/Paystack hosted checkout → signed webhook → durable order/payment record → customer/admin visibility.

Do not expand AI Stories, ads, watch-to-earn, affiliate payouts, DBX token, airdrop, ID card, gift cards, ebooks, or broad architecture unless directly required to unblock registration, products, checkout, payment proof, order proof, or customer support.

## 1. App role contract

### Rocket / Next.js Frontend

- Customer UI and experience layer only.
- Displays products.
- Handles shop/product/cart/checkout UI.
- Captures customer/shipping/profile inputs.
- Calls NestJS/API only.
- Shows safe user-facing messages only.
- Must not call Medusa directly.
- Must not call Supabase service-role flows directly.
- Must not call FastAPI/provider AI directly unless explicitly approved through a public-safe API proxy.
- Must not own business/economic logic.
- Must not expose backend secrets.
- Must not create fake payments/orders/fulfillment/wallet credits.

### NestJS/API

- Central gateway and business/economic brain.
- Rocket, Telegram, Medusa, FastAPI, Supabase, payments all connect through this gateway where possible.
- Owns catalog normalization, checkout/session creation, payment orchestration, auth gateway, profiles, wallets, referrals, payouts, supplier logic, fraud handoff, AI gateway, settlement, and order/payment state.
- Calls Medusa internally for commerce primitives.
- Calls FastAPI internally for AI/security/fraud.
- Calls Supabase server-side for persistence/auth/profile data.

### Medusa

- Commerce engine only.
- Products, variants, prices, inventory, carts, shipping, regions, orders, fulfillment primitives.
- No business/economic decisions.
- No direct Rocket dependency.
- No payout, wallet, affiliate, settlement, AI, or compliance ownership.

### FastAPI

- Security, fraud, AI, intelligence layer.
- Owns AI provider orchestration, fraud/scoring/security helpers, hCaptcha/security-ladder support.
- Called by NestJS/API.
- Must not be used by Rocket as the main business gateway.

### Telegram bot

- Customer support/discovery surface plus protected admin/ops surface.
- Public customer commands must be safe/read-only.
- Admin commands must remain protected by `TELEGRAM_ALLOWED_ADMIN_IDS`.
- Must never mark paid, fulfill orders, credit wallets, approve payouts, fake stock, fake paid, or fake fulfilled states.

### Supabase/Postgres

- Persistence/auth/profile/business data.
- Accessed server-side through NestJS/API or FastAPI where appropriate.
- Service role key must never be exposed to Rocket/client.

## 2. Repo targeting rules

Always verify the repo before making changes.

Backend repo:
`https://github.com/dBaronX1/dBaronX-Backend`

Rocket repo:
`https://github.com/dBaronX1/dbaronx`

Before work, run:

```bash
pwd
basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
git remote -v || true
git branch --show-current || true
git log --oneline -10
```

Accept backend only if:

- repo basename is `dBaronX-Backend`, or
- origin contains `dBaronX1/dBaronX-Backend`.

Accept Rocket only if:

- repo basename is `dbaronx`, or
- origin contains `dBaronX1/dbaronx`.

If the wrong repo is detected:

- stop,
- do not edit,
- report `wrong_repo_detected`.

If only one repo is available:

- fix only that repo,
- clearly report the unavailable repo,
- do not pretend cross-repo validation was completed.

## 3. Quality bar

Do not simplify to pass build.
Do not degrade production capability.
Do not replace real repair logic with placeholder/blocker-only logic unless the blocker is unavoidable and documented.
Do not remove working features unless replacing them with stronger tested logic.
Do not claim solved if result only avoids a crash.
Do not fake readiness.
Do not fake data.
Do not fake paid status.
Do not fake fulfilled status.
Do not fake supplier readiness.
Do not fake AI generation.
Do not hardcode products into Rocket.
Do not reduce catalog back to one product.
Do not introduce demo data as real.
Do not ignore warnings likely to become production blockers.
All fixes must preserve or improve runtime capability.

## 4. Lock-status rules

Before editing:

- identify current confirmed state,
- identify latest commit,
- identify exact failing route/log/screenshot,
- identify which app owns the failure.

Do not alter locked working paths unless task requires it.

Locked as working unless proven otherwise:

- Medusa Store API product visibility after publishable key works.
- NestJS/API catalog gateway must remain central.
- Rocket must call NestJS/API, not Medusa directly.
- Telegram customer mode must remain read-only.
- Stripe signed webhook remains the only proof for `paid_verified`.
- Manual CJ product seed/manual curated products must not be deleted.
- Automatic CJ onboarding must not be removed.
- Profile must not expose raw metadata.
- Auth must not leak raw backend/internal errors.

If a fix touches cross-cutting files:

- minimize diff,
- explain why touch is necessary,
- validate impacted paths.

## 5. Secret and non-leak rules

Never print, commit, expose, or return real values for:

- `DATABASE_URL`
- `MEDUSA_DATABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `JWT_SECRET`
- `COOKIE_SECRET`
- `INTERNAL_SERVICE_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYSTACK_SECRET_KEY`
- `PAYPAL_SECRET`
- `CJ_ACCESS_TOKEN`
- `CJ_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `MEDUSA_ADMIN_API_KEY`
- Render database URLs
- private keys
- webhook secrets

Allowed in Rocket/client:

- `NEXT_PUBLIC_API_BASE_URL`
- public anon keys only if intentionally public
- Medusa publishable key only if explicitly allowed, but preferred architecture is Rocket → NestJS/API, not Rocket → Medusa.

Forbidden in Rocket/client:

- service-role keys
- database URLs
- internal tokens
- Stripe secret keys
- provider AI keys
- CJ keys
- Telegram token
- Medusa admin key

## 6. Customer-facing error rules

Rocket must never display raw backend/internal codes such as:

- `auth_service_unavailable`
- `supabase_error`
- `database_error`
- `internal_service_error`
- `service_role_missing`
- `jwt_error`
- `unexpected_error`
- `failed_to_fetch`
- `TypeError`
- `NetworkError`
- stack traces
- raw provider errors
- raw Supabase messages
- raw Medusa messages
- raw Stripe errors
- raw FastAPI provider errors

Rocket must map them to safe customer messages:

- “Account service is temporarily unavailable. Please try again.”
- “We could not create your account right now. Please check your details and try again.”
- “We could not sign you in. Please check your email and password.”
- “Too many attempts. Please wait a moment and try again.”
- “This email is already registered. Please sign in instead.”
- “Your password is too weak. Please use a stronger password.”
- “Products are temporarily unavailable. Please try again.”
- “Story generation is temporarily unavailable. Please try again.”
- “Checkout is temporarily unavailable. Please try again.”

## 7. Auth rules

Correct architecture:
Rocket → NestJS/API → Supabase/Auth

Rocket must not use privileged Supabase service-role auth.
Rocket must not depend on direct browser Supabase auth for production registration/login if the NestJS auth gateway exists.

NestJS/API must expose or preserve:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/readiness`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm` if supported

Registration must:

- validate email,
- validate password strength,
- validate confirm password,
- accept referralCode optional,
- create Supabase auth user server-side,
- create/update safe profile row,
- return safe user/session contract,
- never leak raw Supabase errors.

Login must:

- authenticate safely,
- return safe token/session contract,
- never leak raw provider errors.

Allowed public backend auth codes:

- `AUTH_TEMPORARILY_UNAVAILABLE`
- `INVALID_EMAIL`
- `WEAK_PASSWORD`
- `PASSWORD_MISMATCH`
- `EMAIL_ALREADY_REGISTERED`
- `INVALID_CREDENTIALS`
- `RATE_LIMITED`
- `SESSION_EXPIRED`
- `PROFILE_CREATION_FAILED`
- `VALIDATION_FAILED`

## 8. Product/catalog rules

Correct product flow:
Rocket → NestJS/API catalog gateway → Medusa Store API internally

Rocket must not call Medusa directly.
Rocket must not use `x-publishable-api-key` in browser source.
Rocket must not require `NEXT_PUBLIC_MEDUSA_BASE_URL` or `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` for production catalog.

NestJS/API must own public-safe product normalization:

- `GET /api/catalog/readiness`
- `GET /api/catalog/products`
- `GET /api/catalog/products/:handle`

Public product shape should include:

- `id`
- `productId`
- `variantId`
- `title`
- `handle`
- `description`
- `thumbnail/images`
- `priceMinor`
- `currencyCode`
- `category`
- `supplier`
- `realSupplierProduct`
- `buyable`
- `deliveryEstimate`
- `sourceUrl` if public-safe
- `metadataPublic`

Never expose:

- supplier cost to customers
- internal metadata
- private IDs not needed for checkout
- secrets
- raw Medusa internals

Rocket must display products where:

- `buyable === true`
- `variantId` exists
- `priceMinor > 0`

Rocket must not hide products because `manualCurated` is false.
Rocket must not fallback to hardcoded products.
Rocket must not reduce catalog back to one shirt.

## 9. Checkout/payment rules

Rocket:

- collects cart/customer/shipping UI data,
- calls NestJS/API checkout/session route,
- redirects only to hosted payment URLs returned by backend.

NestJS/API:

- creates Stripe/Paystack checkout/session,
- validates product/variant/price,
- stores pending checkout/order intent,
- receives signed webhook,
- updates payment/order state only after verified webhook.

Medusa:

- provides product/cart/order/shipping primitives.

Forbidden:

- Rocket must not mark paid.
- Telegram must not mark paid.
- Admin UI must not fake paid.
- Backend must not mark paid without signed webhook proof.
- Do not fake Stripe checkout success.
- Do not fake webhook.
- Do not create live checkout accidentally during smoke tests.

Stripe test mode first:

- use `sk_test` keys for controlled testing.
- if live key is detected, block unless explicit live allowance env is set.

## 10. Supplier/CJ rules

Do not fake supplier readiness.
Do not mark demo products as real.
Do not bulk import CJ unless the task is explicitly CJ onboarding and rate limits are respected.
Do not scrape CJ.
Do not expose CJ credentials.
Do not use unverified stock/shipping/delivery as live-ready.
Do not overwrite unrelated products.
Do not relabel unrelated/demo product as real unless matching supplier metadata proves it is the selected product.

First CJ product baseline:

- title: Men's Cotton Linen Long Sleeve Casual Shirt
- handle: `mens-cotton-linen-long-sleeve-casual-shirt`
- supplier: `cj`
- supplierProductId: `2408300732091605000`
- supplierSku: `CJDS212420104DW`
- costMinorUnits: `419`
- sellingPriceMinorUnits: `1999`
- stockQty: `32`
- shippingCountries: `US`
- deliveryEstimate: `7-15 business days`

Required product metadata:

- `supplier`
- `supplierProductId`
- `supplierSku`
- `sourceUrl`
- `supplierCostAmount`
- `supplierCostCurrency`
- `realSupplierProduct`
- `demo`
- `supplierVerificationStatus`
- `supplierVerificationBlockers` if any

## 11. AI Stories rules

Correct flow:
Rocket → NestJS/API → FastAPI → providers

Rocket must not call OpenAI/Anthropic/Gemini directly.
Rocket must not expose provider keys.
NestJS/API must call FastAPI.
FastAPI owns provider orchestration.

FastAPI must expose:

- `GET /ai/stories/readiness`
- `POST /ai/stories/generate`

Provider env names accepted:

- `GEMINI_API_KEY`
- `GOOGLE_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

Default provider order:
`gemini, openai, anthropic`

Allow:
`AI_PROVIDER_ORDER=gemini,openai,anthropic`

Do not fake story generation.
If no key:
return safe `ai_provider_missing`.
If all fail:
return safe `all_ai_providers_failed`.
Do not expose provider error details to Rocket.

## 12. Profile UI rules

Profile must not show raw metadata.

Never render:

- `email_verified`
- `phone_verified`
- `source`
- `sub`
- provider internals
- service-role data
- raw UUID metadata as “Additional Info”

Remove “Additional Info” section.

Allowed safe labels only:

- Email verification status
- Phone verification status
- Masked profile reference if needed

Gender options:

- Male
- Female
- Prefer not to say

Pronouns options:

- He
- She
- Prefer not to say

Profile photo:

- Upload/Change Photo opens file picker.
- Accept jpg, jpeg, png, webp.
- Preview selected image.
- Upload through safe backend/storage path if available.
- If upload unavailable, show safe blocker, not fake upload success.

Country, phone code, and language:

- single-line controls,
- no duplicated/broken stacked controls.

Password/security:

- password controls are allowed,
- never show password value,
- never show password hash.

## 13. Telegram rules

Telegram port contract:

- `PORT=8080`
- `internal_port=8080`
- Uvicorn binds `0.0.0.0:$PORT`
- `/health` and `/ready` available

Owner/admin:
`TELEGRAM_ALLOWED_ADMIN_IDS` must include `1838800389`.

Public customer commands:

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

Protected admin/ops commands:
status/payment/settlement/commerce/suppliers/medusa/admin diagnostics must remain protected.

Customer mode:

- read-only,
- safe status only,
- no internal diagnostics,
- no secrets.

Forbidden Telegram actions:

- no payout approval,
- no payout settlement,
- no wallet crediting,
- no reward crediting,
- no order fulfillment,
- no fake paid,
- no fake fulfilled,
- no fake stock,
- no supplier import mutation,
- no live money override.

## 14. Database and Render rules

Never paste database URLs.

If any real `DATABASE_URL` or `MEDUSA_DATABASE_URL` was exposed:

- rotate password before live money,
- update Render/GitHub secrets,
- redeploy affected service.

Render internal database URL:

- works only inside Render private network,
- must not be used from local laptop.

Local DB operations:

- use Render External Database URL only,
- never print it,
- never commit it.

Medusa web service start command:
Preferred production start:
`pnpm --filter @dbaronx/medusa run start`

Do not permanently run long one-off scripts before server bind.
Do not permanently leave seed scripts in web start command.

One-off seed/ensure commands:

- run in Render job/shell if available,
- or temporary one deploy cycle only,
- restore normal start command immediately after success.

## 15. Codex commit/PR rules

Do not commit until required validation passes.
Do not create PR metadata until required validation passes.
If validation fails:

- do not commit,
- do not create PR,
- report exact failure.

If environment blocks validation:

- report `environment_blocked`,
- state what was and was not validated,
- do not claim production-ready.

If only smoke/test files pass but build fails:

- no commit.

If lint fails on unrelated pre-existing files:

- report separately,
- do not hide it,
- run agreed task-specific validation suite,
- do not claim full lint-clean unless fixed.

## 16. Validation rules

Use this base validation set, then adjust per app touched.

Backend monorepo:

```bash
pnpm install --frozen-lockfile
pnpm --filter dbaronx-api build
pnpm --filter @dbaronx/medusa build
pnpm --filter @dbaronx/medusa typecheck
pnpm --filter dbaronx-web build || true
python -m compileall apps/services-fastapi/src apps/telegram-bot/src || true
git grep -n "<<<<<<<\|=======\|>>>>>>>" apps scripts docs .github || true
git diff --check
```

Rocket repo:

```bash
npm install
npm run type-check
npm run build
git grep -n "<<<<<<<\|=======\|>>>>>>>" . || true
git diff --check
```

Secret scans:

```bash
git grep -n "DATABASE_URL=.*[A-Za-z0-9]" . || true
git grep -n "MEDUSA_DATABASE_URL=.*[A-Za-z0-9]" . || true
git grep -n "SUPABASE_SERVICE_ROLE_KEY=.*[A-Za-z0-9]" . || true
git grep -n "JWT_SECRET=.*[A-Za-z0-9]" . || true
git grep -n "COOKIE_SECRET=.*[A-Za-z0-9]" . || true
git grep -n "INTERNAL_SERVICE_TOKEN=.*[A-Za-z0-9]" . || true
git grep -n "STRIPE_SECRET_KEY=.*[A-Za-z0-9]" . || true
git grep -n "STRIPE_WEBHOOK_SECRET=.*[A-Za-z0-9]" . || true
git grep -n "CJ_ACCESS_TOKEN=.*[A-Za-z0-9]" . || true
git grep -n "CJ_API_KEY=.*[A-Za-z0-9]" . || true
git grep -n "TELEGRAM_BOT_TOKEN=.*[A-Za-z0-9]" . || true
git grep -n "OPENAI_API_KEY=.*[A-Za-z0-9]" . || true
git grep -n "ANTHROPIC_API_KEY=.*[A-Za-z0-9]" . || true
git grep -n "GEMINI_API_KEY=.*[A-Za-z0-9]" . || true
```

If matches are only forbidden-pattern smoke/test strings or placeholder docs, report that clearly.

## 17. Deployment order rules

Deploy only changed apps.

If multiple apps changed:

1. NestJS/API
2. Medusa
3. Telegram bot
4. Rocket/Web
5. FastAPI only if changed

Exception:

- Rocket-only UI/auth client fix: deploy Rocket after API is already live.
- FastAPI AI route fix: deploy FastAPI first, then API if gateway changed, then Rocket.
- Medusa seed/script fix: deploy Medusa only.
- Telegram port/command fix: deploy Telegram only.
- Auth gateway fix: deploy API first, then Rocket.

## 18. Rocket.new specific rules

Use this shorter header for Rocket.new prompts:

```text
ROCKET.NEW DBX RULES

You are editing the Rocket frontend only.

Do not change backend architecture.
Do not call Medusa directly.
Do not call Supabase service-role or privileged APIs.
Do not call FastAPI/provider AI directly.
Do not expose secrets.
Do not hardcode products.
Do not fake checkout.
Do not show raw backend errors.
Do not show raw profile metadata.
Do not break the dBaronX dark purple/blue premium UI.

Rocket must call:
NEXT_PUBLIC_API_BASE_URL=https://dbaronx-api-unified-qo2j.onrender.com

Product catalog:
call NestJS/API /api/catalog/products, not Medusa.

Product detail:
call NestJS/API /api/catalog/products/:handle.

Checkout:
call NestJS/API checkout/session route.
Redirect only to hosted payment URL returned by backend.

Auth:
call NestJS/API /api/auth/register, /login, /logout, /me.
Never display raw error codes.

AI Stories:
call NestJS/API /api/v1/ai-stories/generate.
Never expose provider keys.

Profile:
remove Additional Info/raw metadata.
Gender: Male, Female, Prefer not to say.
Pronouns: He, She, Prefer not to say.
Photo upload accepts jpg/jpeg/png/webp.
Country/phone/language are single-line controls.

Validation:
npm install
npm run type-check
npm run build
git grep -n "<<<<<<<\|=======\|>>>>>>>" . || true
git grep -n "auth_service_unavailable" . || true
git grep -n "NEXT_PUBLIC_MEDUSA" . || true
git grep -n "SUPABASE_SERVICE_ROLE_KEY" . || true
git diff --check

Commit only if validation passes.
```

## 19. Return-format rule for every Codex prompt

Return:

- repo detected
- branch
- root cause
- changed files
- exact behavior fixed
- safety rules preserved
- validation commands run
- validation results
- secret scan results
- commit hash if committed
- PR status if created
- deployment order
- manual tests after deploy
- remaining blockers

If anything was not validated, say exactly what was not validated and why.

## Minimum header to paste every time

When the prompt must be short, paste this:

```text
DBX COMMAND MODE

Do not simplify to pass build.
Do not fake readiness.
Do not expose secrets.
Do not hardcode products.
Do not leak backend/internal errors to users.
Do not move responsibilities across apps.

Architecture:
Rocket → NestJS/API → Medusa/FastAPI/Supabase/Payments.
Rocket must not call Medusa directly.
Rocket must not use service-role Supabase.
NestJS/API is central gateway/business brain.
Medusa is commerce-only.
FastAPI is AI/security/fraud.
Telegram is customer support/discovery plus protected admin ops.

Quality:
Preserve or improve production capability.
No destructive rewrites.
No fake paid/fulfilled/stock/supplier/AI.
No raw metadata or backend codes in UI.
Commit only after validation passes.

Secrets:
Never expose DATABASE_URL, MEDUSA_DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, COOKIE_SECRET, INTERNAL_SERVICE_TOKEN, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, CJ keys, Telegram token, or AI provider keys.

Validation:
Run build/typecheck/smokes for touched apps.
Run conflict scan and secret scan.
Return root cause, changed files, validation results, commit hash, deployment order, and manual test steps.
```
