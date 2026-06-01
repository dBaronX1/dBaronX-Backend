# dBaronX Production Lock State

This manifest locks the production revenue path for the backend repository. It exists to prevent regressions that make Rocket fall back to client-side caches, hide real products, break account readiness, block hosted checkout, or route AI Stories away from the approved FastAPI gateway.

## Protected milestones

| Milestone | Required production contract | Owner |
| --- | --- | --- |
| `authReadinessRoute` | `GET /api/auth/readiness` remains public and reports auth provider/profile readiness safely. | NestJS/API |
| `authRegisterRoute` | `POST /api/auth/register` remains public, validates email/password/confirmation, maps provider failures to safe public auth codes, and does not fake registration success. | NestJS/API |
| `authLoginRoute` | `POST /api/auth/login` remains public, returns the safe session contract on valid credentials, and never exposes raw provider errors. | NestJS/API |
| `ownerBootstrapGuarded` | Owner bootstrap remains guarded, idempotent, and unavailable without the configured bootstrap controls. | NestJS/API |
| `catalogProductsRoute` | `GET /api/catalog/products` remains mounted under the API prefix and returns Rocket-safe normalized products from Medusa Store API. | NestJS/API → Medusa |
| `catalogProductDetailRoute` | `GET /api/catalog/products/:handle` remains mounted and returns a safe `PRODUCT_NOT_FOUND` response for missing handles. | NestJS/API → Medusa |
| `medusaBridgeHealthy` | Catalog readiness checks `MEDUSA_BASE_URL`, `MEDUSA_PUBLISHABLE_KEY`, and Medusa Store API `/store/products` with the publishable key server-side only. | NestJS/API → Medusa |
| `productCountAtLeastOne` | If Medusa has products, the API catalog must normalize at least one buyable product instead of forcing Rocket to use Supabase fallback. | NestJS/API |
| `firstCjProductVisibleIfSeeded` | When the canonical CJ shirt is seeded and buyable, the API catalog must keep it visible. | NestJS/API → Medusa |
| `checkoutReadinessRoute` | `GET /api/checkout/readiness` remains public and reports Stripe, Paystack, webhook, and multi-line checkout readiness. | NestJS/API |
| `stripeCheckoutSession` | `POST /api/checkout/session` can create a hosted Stripe Checkout Session for validated cart line items when Stripe is configured. | NestJS/API → Stripe |
| `paystackCheckoutSession` | `POST /api/checkout/session` can initialize Paystack when `paymentProvider` is `paystack` and Paystack is configured. | NestJS/API → Paystack |
| `multiLineCheckout` | Checkout accepts `lineItems`/`line_items` arrays and must not regress to a single-item-only cart. | NestJS/API |
| `noFakePaid` | Paid/verified order state is never created by Rocket, Telegram, smoke tests, or unsigned backend requests; signed payment webhooks remain the proof boundary. | NestJS/API |
| `aiStoriesFastApiReadiness` | FastAPI keeps `/ai/stories/readiness` and `/ai/stories/generate`, provider env detection, provider ordering, and safe provider errors. | FastAPI |
| `aiStoriesNestGatewayReadiness` | NestJS keeps `GET /api/v1/ai-stories/readiness` and `POST /api/v1/ai-stories/generate`, and calls FastAPI `/ai/stories/*` routes only. | NestJS/API → FastAPI |
| `telegramUnaffected` | Telegram remains a support/discovery surface with protected admin operations and no fake payment, fulfillment, wallet, payout, supplier, or stock mutation. | Telegram bot |

## Public safety contract

- Rocket must call the NestJS/API catalog, auth, checkout, and AI gateway routes.
- Rocket must never need a Medusa publishable key for catalog loading.
- Catalog responses must not expose supplier cost, secret-like metadata, raw Medusa internals, or raw upstream failure text.
- Catalog bridge failures must map to `CATALOG_TEMPORARILY_UNAVAILABLE` with the safe customer message: “Products are temporarily unavailable. Please try again.”
- Supabase `supplier_products` is not the production catalog source of truth for Rocket; Medusa Store API is the source for public products.
- Supabase auth database user creation is not declared fixed until the diagnostic and safe repair SQL have been run manually in the production Supabase project.

## Required local source lock smoke

Run:

```bash
node scripts/e2e-dbx-production-lock-state-smoke.mjs
```

The smoke is source-only and does not create users, checkout sessions, products, paid states, AI generations, supplier imports, or CJ onboarding.
