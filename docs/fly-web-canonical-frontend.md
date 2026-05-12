# Fly Web Canonical Frontend

Fly Web (`dbaronx-web`) is the canonical production frontend for customers. Rocket.new remains the design/source generator for the storefront look and feel; production runtime control, auth configuration, redirects, and backend connectivity belong in this repository and deploy through Fly Web.

## Canonical auth URLs

- Production signup URL: `/register`
- Compatibility signup URL: `/signup` redirects to `/register` and preserves `ref`, `invite`, `init`, and `next`.
- Production login URL: `/login`
- Compatibility login URL: `/signin` redirects to `/login` and preserves `ref`, `invite`, `init`, and `next`.
- Supabase callback URL: `/auth/callback`

No customer-facing auth screen may show environment variable names or raw developer configuration instructions. If auth config is temporarily unavailable, the UI must say: `Signup is temporarily unavailable. Please try again shortly or contact support.`

## Required Fly Web public envs

Set these on the Fly Web app before the production release:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_MEDUSA_BACKEND_URL=
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

Only the Supabase public anon key belongs in Web. Do not put Supabase service role, database URLs, Stripe secrets, Telegram tokens, CJ tokens, or internal service tokens in the Web frontend.

## Why Fly secrets can look missing in Next.js

Next.js embeds `NEXT_PUBLIC_*` values into client JavaScript during `next build`. If Fly secrets are added after an image was built, the running server process can see them at runtime, but an already-built browser bundle may still contain empty build-time values. That mismatch is why a customer could see auth fail even after Fly secrets were set and the app was restarted from an image built without those public values.

## Runtime public-config fallback

Fly Web now exposes `/api/public-config` as a runtime fallback for safe public values only:

- `supabaseUrl`
- `supabaseAnonKey`
- `apiBaseUrl`
- `medusaBackendUrl`
- `medusaPublishableKey`
- `siteUrl`

The browser auth client first uses build-time `NEXT_PUBLIC_*` values when present. If Supabase URL or anon key were missing from the build-time bundle, signup/login fetch `/api/public-config` at runtime and initialize Supabase from that response. The route must never return service role keys, database URLs, Stripe secrets, Telegram tokens, CJ tokens, or internal tokens.

## Operator checks

Run the auth readiness smoke before and after Fly Web deployment:

```bash
pnpm web:auth:readiness
WEB_BASE_URL=https://dbaronx-web.fly.dev pnpm web:auth:readiness
```

A green deployed result confirms `/register`, `/signup`, `/login`, `/signin`, `/auth/callback`, `/api/public-config`, customer-safe errors, and Rocket-style auth UI preservation.

## Supabase Auth email-confirmation checklist

- Enable the Supabase Email provider before production signup testing.
- Decide whether **Confirm Email** is enabled. If enabled, `/register` will create the account, keep the customer on the Rocket-style success state, and ask them to confirm email before signing in.
- Set Supabase Auth **Site URL** to `https://dbaronx.com`.
- Add Supabase Auth redirect URLs:
  - `https://dbaronx.com/auth/callback`
  - `https://www.dbaronx.com/auth/callback`
  - `https://dbaronx-web.fly.dev/auth/callback`
- Configure custom SMTP for production email reliability; Supabase default email is acceptable only for limited development tests.
- During signup tests, check inbox, spam, and promotions. Use the `/register` **Resend confirmation email** action if the first message does not arrive.
- Do not expose the Supabase service role key to the frontend. Web may only receive the public Supabase URL and anon key.
