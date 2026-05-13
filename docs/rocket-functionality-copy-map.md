# Rocket Functionality Copy Map

This map identifies the dBaronX frontend functionality files that may be copied into the Rocket frontend without replacing Rocket-designed pages or customer-facing components. Copy these files as logic, hooks, route handlers, and runtime helpers only.

## Copy map

| Source path in `dbaronx-ecosystem` | Destination path in Rocket frontend | Purpose | Required? | How Rocket visual pages should import/use it |
|---|---|---|---|---|
| `apps/web/src/lib/env.ts` | `src/lib/env.ts` | Normalizes public browser-safe configuration and resolves auth redirect URLs. | Required | Import `getPublicEnv` for browser-safe public config and `resolveAuthRedirect` when building auth redirect URLs from Rocket forms. |
| `apps/web/src/lib/public-config.ts` | `src/lib/public-config.ts` | Provides build-time and runtime public config loading plus safe payload validation. | Required | Keep as an internal helper used by auth clients and `/api/public-config`; Rocket pages do not render copy from it. |
| `apps/web/src/app/api/public-config/route.ts` | `src/app/api/public-config/route.ts` | Exposes browser-safe public runtime config to the frontend when build-time values are unavailable. | Required for runtime config fallback | Keep the route handler in the app router; Rocket visuals should call functionality through hooks/clients, not render this payload directly. |
| `apps/web/src/lib/supabase/client.ts` | `src/lib/supabase/client.ts` | Creates a build-time browser auth client and exposes redirect URL helper. | Optional if using runtime client only | Import `getSupabaseBrowserClient` in Rocket form handlers when public config is guaranteed at build/deploy time. |
| `apps/web/src/lib/supabase/server.ts` | `src/lib/supabase/server.ts` | Creates a server-side anonymous auth client for route handlers/server-only flows. | Optional | Use from server routes/actions only; do not import directly into Rocket client components. |
| `apps/web/src/lib/supabase/runtime-client.ts` | `src/lib/supabase/runtime-client.ts` | Creates a browser auth client after loading safe runtime public config. | Required for login/register/profile | Import `getSupabaseRuntimeBrowserClient` inside Rocket client form handlers and hooks. |
| `apps/web/src/app/auth/callback/route.ts` | `src/app/auth/callback/route.ts` | Handles auth code exchange and safely redirects back to a local Rocket page while preserving referral params. | Required for hosted auth redirects | Keep as a route handler; set auth providers to redirect to `/auth/callback`. |
| `apps/web/src/lib/auth/referral-capture.ts` | `src/lib/auth/referral-capture.ts` | Captures referral/invite/init query params and maps them into auth metadata. | Optional but recommended | Import `captureReferralParams`, `referralMetadata`, and `appendReferralParams` in Rocket register/login flows. |
| `apps/web/src/lib/api/dbx-api-client.ts` | `src/lib/api/dbx-api-client.ts` | Browser-safe dBaronX API request helper. | Optional | Import `dbxApiRequest` from event handlers/hooks that need dBaronX API calls; keep errors inside Rocket-designed feedback areas. |
| `apps/web/src/lib/api/medusa-store-client.ts` | `src/lib/api/medusa-store-client.ts` | Product fetching and product data formatting helpers. | Required for shop/products | Import fetchers in data hooks or server components and formatting helpers in Rocket product cards. |
| `apps/web/src/lib/hooks/useAuthSession.ts` | `src/lib/hooks/useAuthSession.ts` | React hook for current auth session state. | Required for account/profile | Import from Rocket account/profile/navigation components to decide signed-in state and user metadata. |
| `apps/web/src/lib/hooks/useMedusaProducts.ts` | `src/lib/hooks/useMedusaProducts.ts` | React hook for product listing data. | Required for shop/products | Import in Rocket shop sections and render returned products with Rocket cards/layouts. |
| `apps/web/src/lib/hooks/useFirstProduct.ts` | `src/lib/hooks/useFirstProduct.ts` | React hook for the first launch product by handle. | Optional | Import in a Rocket featured-product section and render only through Rocket-designed components. |

## Files not to copy

Do not copy customer-facing page/component files from `apps/web/src/app` or `apps/web/src/components`. In particular, do not copy any quarantined/generated public UI components such as:

- `apps/web/src/components/rocket/RocketShell.tsx`
- `apps/web/src/components/rocket/StaticPages.tsx`
- `apps/web/src/components/rocket/ProductViews.tsx`
- `apps/web/src/components/rocket/CustomerAccountPanel.tsx`
- `apps/web/src/components/dbx/StaticPages.tsx`
- `apps/web/src/components/dbx/ProductViews.tsx`
- `apps/web/src/components/dbx/CustomerAccountPanel.tsx`

## Import pattern

Rocket pages should keep their existing JSX, CSS, motion, responsive layout, and copy. Replace only inline data/auth logic with imports from `src/lib/**`, `src/lib/hooks/**`, and the route handlers listed above.
