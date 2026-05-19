# Rocket Production Frontend Implementation Checklist (dBaronX/dbaronx)

This checklist is for the **Rocket repo** only and is sourced from the backend contract in `dbaronx-ecosystem`.

## Product integration

- [ ] `src/lib/supabase-products.ts`
- [ ] `src/lib/hooks/useSupabaseProducts.ts`
- [ ] `src/lib/store-products.ts`
- [ ] `src/app/api/storefront/products/route.ts`
- [ ] `src/app/api/storefront/products/[handle]/route.ts`
- [ ] `src/app/home/components/TeaserProductsSection.tsx`
- [ ] `src/app/shop/page.tsx`
- [ ] `src/app/products/page.tsx`
- [ ] `src/app/products/[handle]/page.tsx`
- [ ] Product list/detail only show active+verified rows from `app_public.storefront_products`.
- [ ] Do not expose forbidden fields (`cost_minor`, unsafe `cj_raw`, secrets).

## Checkout integration

- [ ] `src/lib/api.ts`
- [ ] `src/lib/checkout/stripe.ts` (if used)
- [ ] Checkout button/card components wired to backend checkout contract
- [ ] Payment success/cancel/status pages
- [ ] Uses `POST /api/checkout/stripe/session` only
- [ ] Opens checkout only from backend-returned `checkoutUrl`
- [ ] Never marks paid client-side
- [ ] Never creates fake order success/fulfillment state

## Auth/profile integration

- [ ] `src/contexts/AuthContext.tsx`
- [ ] `src/app/register/page.tsx`
- [ ] `src/app/login/page.tsx`
- [ ] `src/app/account/page.tsx`
- [ ] `src/app/profile/page.tsx`
- [ ] `src/middleware.ts`
- [ ] Auth source is Supabase Auth
- [ ] Browser never receives `SUPABASE_SERVICE_ROLE_KEY`

## AI stories integration

- [ ] `src/app/api/ai-stories/route.ts`
- [ ] `src/app/ai-stories/page.tsx`
- [ ] `src/app/ai-story-generator/page.tsx`
- [ ] UI renders `data.content`
- [ ] UI does not render `data.story` object directly as string
- [ ] Request body never sets `user_id="anonymous"`

## Support integration

- [ ] `src/app/support/page.tsx`
- [ ] `src/app/contact/page.tsx`
- [ ] Footer/header links include Telegram support link (`https://t.me/dBaronX_bot`)
- [ ] Show customer commands only:
  - [ ] `/shop`
  - [ ] `/products`
  - [ ] `/product <handle_or_id>`
  - [ ] `/cart_help`
  - [ ] `/checkout_help`
  - [ ] `/order_status <order_or_email_or_reference>`
  - [ ] `/payment_status <checkout_session_or_order_ref>`
  - [ ] `/support`
  - [ ] `/contact_support`
- [ ] Do not show admin/ops commands to normal users
