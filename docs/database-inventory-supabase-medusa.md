# Supabase + Medusa database inventory

Generated for branch `codex/complete-database-pack-supabase-medusa-readiness` on 2026-05-14.

## Inventory method

Inspected these repository areas for Supabase table/RPC usage and domain keywords:

- `apps/api/src/**`
- `apps/services-fastapi/src/**`
- `apps/telegram-bot/src/**`
- `apps/web/src/lib/**`
- `supabase/**`
- `scripts/**`

Primary code patterns searched: `.from(`, `rpc(`, wallet/ledger/affiliate/referral/user/profile/stripe/webhook/payment/economic/order/checkout/ads/watch/campaign/ai-stories/dreams/support/notifications/audit/compliance/risk/captcha/device/payout/subscription/token/crowdfunding keywords.

## Supabase-owned tables used directly by current code

Direct `.from(...)` calls currently target these Supabase-owned application tables:

| Table | Main users | Ownership |
| --- | --- | --- |
| `ad_campaigns` | NestJS ads services | Supabase application data |
| `ai_stories` | NestJS AI stories admin | Supabase application data |
| `ai_story_campaigns` | NestJS AI stories lifecycle/orchestration/scheduler/distribution | Supabase application data |
| `checkout_settlements` | NestJS payments settlement/admin | Supabase application data |
| `commerce_fulfillment_sync` | NestJS commerce fulfillment sync/admin | Supabase application sync table, not Medusa core |
| `commerce_order_sync` | NestJS commerce order sync/reconciliation/admin | Supabase application sync table, not Medusa core |
| `commerce_product_sync` | NestJS commerce product sync/admin | Supabase application sync table, not Medusa core |
| `commerce_settlements` | NestJS commerce settlement bridge/admin | Supabase application settlement bridge |
| `commerce_variant_sync` | NestJS commerce variant sync/admin | Supabase application sync table, not Medusa core |
| `dbx_crypto_payment_events` | NestJS DBX payment repository/query | Supabase application crypto payment table; already exists |
| `dbx_crypto_payment_intents` | NestJS DBX payment repository/jobs/query | Supabase application crypto payment table; already exists |
| `dbx_crypto_payment_verifications` | NestJS DBX payment repository | Supabase application crypto payment table; already exists |
| `economic_events` | NestJS Stripe checkout and economic-event repository | Supabase application event ledger; repaired by durable and complete migrations |
| `health_check` | NestJS Supabase health service | Supabase operational readiness table |
| `intelligence_audit_traces` | NestJS payments/system/decision trace bridge | Supabase application audit table |
| `ledger_entries` | NestJS wallet admin/ledger | Supabase application wallet compatibility table |
| `payout_requests` | NestJS payout lifecycle/review/admin | Supabase application payout table |
| `stripe_webhook_events` | NestJS Stripe checkout webhook storage | Supabase durable signed webhook table; repaired by durable and complete migrations |
| `supplier_orders` | NestJS supplier lifecycle/orchestration/fulfillment/admin | Supabase supplier sync table, not Medusa core |
| `system_launch_readiness_snapshots` | NestJS system launch audit/readiness persistence | Supabase operational readiness table |
| `wallet_holds` | NestJS ads/AI/supplier/payout/wallet orchestration | Supabase application wallet hold table |
| `wallets` | NestJS wallet admin/ledger/orchestration | Supabase application wallet table |

## Supabase-owned tables missing from earlier migrations and added by the complete pack

Earlier migrations contained durable Stripe/economic-event tables, crypto payment tables, and `public.dbx_*` foundation tables. The current production code and operator requirements still needed unprefixed `app_public` application tables. The complete pack adds/repairs the following `app_public` tables:

- Owner/user/profile: `platform_users`, `user_profiles`, `first_owner_bootstrap_claims`, `owner_reference_codes`, `referral_codes`, `invitation_links`, `initiation_links`.
- Wallet/ledger/rewards: `wallets`, `wallet_ledger_entries`, `ledger_entries`, `wallet_holds`, `reward_events`, `reward_balances`.
- Affiliate/referral/payout: `affiliate_accounts`, `affiliate_clicks`, `affiliate_conversions`, `affiliate_commissions`, `affiliate_payout_requests`, `affiliate_payouts`, `payout_requests`.
- Payments/Stripe/economic events: `stripe_webhook_events`, `payment_records`, `checkout_payment_sessions`, `checkout_settlements`, `economic_events`, `economic_event_outbox`, `settlement_runs`, `idempotency_keys`.
- Orders/Medusa sync: `commerce_order_refs`, `medusa_order_sync_jobs`, `medusa_order_events`, `fulfillment_tracking_events`, `commerce_order_sync`, `commerce_fulfillment_sync`, `commerce_product_sync`, `commerce_variant_sync`, `commerce_settlements`, `supplier_orders`.
- Ads/watch-to-earn: `advertiser_accounts`, `ad_campaigns`, `ad_creatives`, `ad_watch_sessions`, `ad_watch_events`, `ad_reward_confirmations`, `ad_budget_ledger`, `ad_fraud_events`.
- AI stories: `ai_stories`, `ai_story_generations`, `ai_story_usage_events`, `ai_story_promotion_events`, `ai_story_campaigns`.
- Dreams/crowdfunding: `dream_projects`, `dream_pledges`, `dream_contributions`, `dream_reward_claims`.
- Support/notifications: `support_tickets`, `support_messages`, `notifications`, `notification_deliveries`.
- Security/risk/compliance: `risk_events`, `device_fingerprints`, `captcha_verifications`, `auth_security_events`, `compliance_checks`, `sanctions_screening_events`, `geo_policy_events`, `audit_logs`, `intelligence_audit_traces`.
- System/ops: `system_settings`, `system_readiness_checks`, `system_launch_readiness_snapshots`, `background_jobs`, `webhook_delivery_attempts`, `health_check`.

## Supabase RPC/functions used by current code

The NestJS first-owner bootstrap path calls `dbx_bootstrap_first_owner_user` through Supabase RPC. Earlier foundation SQL created a `public.dbx_bootstrap_first_owner_user(...)` function for the legacy `public.dbx_*` foundation tables.

The complete pack creates/repairs the service-role `app_public` RPC/function set:

- `app_public.dbx_bootstrap_first_owner_user(...)`
- `app_public.get_or_create_wallet(...)`
- `app_public.record_wallet_ledger_entry(...)`
- `app_public.record_idempotency_key(...)`
- `app_public.record_stripe_webhook_event(...)`
- `app_public.record_economic_event(...)`
- `app_public.set_updated_at()`
- `app_public.generate_reference_id(...)`
- `app_public.generate_referral_code()`
- `app_public.generate_initiation_code()`

## Supabase functions missing from earlier migrations

These helper functions were not present in the earlier durable Stripe or platform-foundation migrations and are added by `202605140001_complete_dbaronx_application_schema.sql`:

- `app_public.get_or_create_wallet(...)`
- `app_public.record_wallet_ledger_entry(...)`
- `app_public.record_idempotency_key(...)`
- `app_public.record_stripe_webhook_event(...)`
- `app_public.record_economic_event(...)`
- `app_public.set_updated_at()`

## Medusa-owned tables that must NOT be created in Supabase

Do **not** create Medusa core commerce tables manually in Supabase SQL. Medusa owns its commerce schema and must create/repair it through Medusa migrations and scripts only.

Do not create these categories in Supabase SQL:

- Region/currency/tax/payment provider tables.
- Sales channel and publishable API key tables.
- Product, variant, image, collection, option, price-list, and pricing tables.
- Cart, line item, shipping method, fulfillment, order, payment collection, payment session, inventory item, inventory level, stock location, service zone, fulfillment set, shipping profile, and shipping option tables.
- Any Medusa module tables required by `@medusajs/framework` or the Medusa CLI.

Supabase may contain dBaronX-owned references/sync state such as `commerce_order_refs`, `commerce_order_sync`, `commerce_product_sync`, `commerce_variant_sync`, `medusa_order_events`, and `fulfillment_tracking_events`; those are not Medusa core commerce tables.

## Medusa readiness scripts responsible for commerce primitives

Run Medusa commands on the Medusa service/database, not inside the Supabase SQL editor:

1. `pnpm --filter @dbaronx/medusa run db:prepare` — runs official Medusa migrations and validates core commerce table readiness.
2. `pnpm --filter @dbaronx/medusa run launch-commerce:ensure` — idempotently ensures dBaronX launch commerce primitives such as region, sales channel, publishable key linkage, shipping setup, stock location, inventory, and Store API visibility.
3. `DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa run first-product:reseed:canonical` — explicit operator seed/reseed for the canonical CJ first product after Medusa DB readiness is green.

## Exact SQL migration files generated/used

Run Supabase migrations in chronological order. The new complete pack is:

- `supabase/migrations/202605140001_complete_dbaronx_application_schema.sql`

It builds on these existing relevant migrations:

- `supabase/migrations/202604250001_dbx_crypto_payments.sql`
- `supabase/migrations/202605080001_stripe_verified_settlement_events.sql`
- `supabase/migrations/202605090001_extend_stripe_verified_settlement_events.sql`
- `supabase/migrations/202605090002_stripe_settlement_lookup_indexes.sql`
- `supabase/migrations/202605110001_dbx_platform_foundation.sql`
- `supabase/migrations/202605130001_durable_stripe_webhook_economic_events.sql`

## Exact operator run order

1. Confirm you are connected to the production Supabase project and not a Medusa database.
2. Paste/run `supabase/migrations/202605140001_complete_dbaronx_application_schema.sql` in the Supabase SQL editor, or apply migrations chronologically through the approved Supabase migration path.
3. Confirm no SQL errors and no manual Medusa core tables were created in Supabase.
4. On the Medusa Render service, run `pnpm --filter @dbaronx/medusa run db:prepare`.
5. On the Medusa Render service, run `pnpm --filter @dbaronx/medusa run launch-commerce:ensure`.
6. On the Medusa Render service, run `DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa run first-product:reseed:canonical`.
7. Restore the normal Medusa start path after the one-cycle seed action.
8. Run the repo readiness smokes, then perform only controlled Stripe test checkout until signed webhook/economic-event proof is visible.
