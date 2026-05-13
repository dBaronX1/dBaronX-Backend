# Rocket source to production web merge

This merge recreates the Rocket visual production UI for `apps/web` while preserving the Codex-built backend integration files that make the Fly frontend safe for production.

## Scope

- Rocket-styled storefront and customer portal routes: `/`, `/home`, `/register`, `/login`, `/account`, `/profile`, `/dashboard`, `/shop`, `/products`, `/products/[handle]`, `/orders`, `/wallet`, `/referrals`, `/support`, `/contact_support`, `/terms`, `/privacy`, `/checkout/success`, and `/checkout/cancel`.
- Rocket-styled `not-found` and `error` pages.
- Text SVG fallbacks only: `apps/web/public/assets/images/app_logo.svg` and `apps/web/public/assets/images/no_image.svg`.
- No binary image files are required for the final diff.

## Preserved production integration

The production UI continues to use:

- runtime public config from `/api/public-config`;
- Supabase Auth browser/session behavior and `/auth/callback`;
- referral capture through register/login/callback flows;
- Medusa Store API product listing and handle lookup;
- customer-safe error copy instead of raw environment, server, or secret values.

## Operational notes

`apps/web` remains the Fly production frontend. Configure only public frontend values with `NEXT_PUBLIC_*` names in the web app. Server-only secrets such as service role keys, database URLs, Stripe secret keys, Telegram bot tokens, and CJ access tokens must not be added to `apps/web` source or public runtime config.
