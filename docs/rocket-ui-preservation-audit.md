# Rocket UI Preservation Audit

## Decision

The polished Rocket/dBaronX auth surface is canonical at `/register`. The old plain `/signup` form is no longer a customer-facing auth UI; `/signup` redirects to `/register` while preserving `ref`, `invite`, `init`, and `next`.

## Preserved design requirements

- Do not overwrite the Rocket homepage, layout, or global design.
- Do not remove social links.
- Do not replace polished `/register` UI with the plain `/signup` fallback.
- Keep `/login` visually aligned with the Rocket-style auth surface.
- Keep Rocket.new as the design/source generator while Fly Web remains the production frontend.

## Current auth route behavior

| Route | Behavior |
| --- | --- |
| `/register` | Renders polished dBaronX/Rocket-style signup UI. |
| `/signup` | Redirects to `/register`, preserving `ref`, `invite`, `init`, and `next`. |
| `/login` | Renders polished dBaronX/Rocket-style login UI. |
| `/signin` | Redirects to `/login`, preserving `ref`, `invite`, `init`, and `next`. |
| `/auth/callback` | Handles Supabase callback redirects and preserves referral parameters. |

## Runtime config preservation

The auth UI no longer permanently fails when client build-time Supabase values are empty. It initializes from build-time `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` when available, then falls back to `/api/public-config` at runtime when needed.

Customer errors remain human-safe. Customers must not see `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, service role names, database URLs, Stripe secret names, Telegram token names, or CJ token names.

## Smoke coverage

Use:

```bash
pnpm web:auth:readiness
```

The smoke checks auth route reachability/redirects, safe public-config keys, Supabase public config readiness when env is set, absence of unsafe env instructions in page HTML, social-link presence, and likely Rocket UI preservation.

## Supabase Auth email-confirmation checklist

- `/register` must keep the polished Rocket-style design while collecting full name, email, password, confirm password, and optional referral code.
- Signup metadata must preserve `full_name`, `display_name`, `referral_code`, `invite_code`, `initiation_code`, `source`, and `onboarding_target` for Supabase Auth users.
- Supabase Email provider must be enabled, and operators must decide whether **Confirm Email** is enabled.
- Supabase Auth **Site URL** must be `https://dbaronx.com`.
- Supabase Auth redirect URLs must include:
  - `https://dbaronx.com/auth/callback`
  - `https://www.dbaronx.com/auth/callback`
  - `https://dbaronx-web.fly.dev/auth/callback`
- Production email reliability requires custom SMTP. During tests, check spam/promotions and verify the **Resend confirmation email** action.
- Do not expose the Supabase service role key or other backend secrets to the frontend.
