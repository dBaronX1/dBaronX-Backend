#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const migrationPath = join(root, "supabase/migrations/202605140001_complete_dbaronx_application_schema.sql");
const medusaDocPath = join(root, "docs/medusa-database-readiness.md");
const operatorDocPath = join(root, "docs/first-transaction-final-operator-pack.md");
const inventoryDocPath = join(root, "docs/database-inventory-supabase-medusa.md");

const blockers = [];
const requireText = (label, text, values) => {
  for (const value of values) {
    if (!text.includes(value)) blockers.push(`${label}_missing_${value}`);
  }
};

if (!existsSync(migrationPath)) blockers.push("complete_database_pack_migration_missing");
if (!existsSync(medusaDocPath)) blockers.push("medusa_database_readiness_doc_missing");
if (!existsSync(operatorDocPath)) blockers.push("first_transaction_operator_pack_missing");
if (!existsSync(inventoryDocPath)) blockers.push("database_inventory_doc_missing");

const sql = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";
const medusaDoc = existsSync(medusaDocPath) ? readFileSync(medusaDocPath, "utf8") : "";
const operatorDoc = existsSync(operatorDocPath) ? readFileSync(operatorDocPath, "utf8") : "";
const inventoryDoc = existsSync(inventoryDocPath) ? readFileSync(inventoryDocPath, "utf8") : "";

const requiredTables = [
  "platform_users", "user_profiles", "first_owner_bootstrap_claims", "owner_reference_codes", "referral_codes", "invitation_links", "initiation_links",
  "wallets", "wallet_ledger_entries", "wallet_holds", "reward_events", "reward_balances",
  "affiliate_accounts", "affiliate_clicks", "affiliate_conversions", "affiliate_commissions", "affiliate_payout_requests", "affiliate_payouts",
  "stripe_webhook_events", "payment_records", "checkout_payment_sessions", "economic_events", "economic_event_outbox", "settlement_runs", "idempotency_keys",
  "commerce_order_refs", "medusa_order_sync_jobs", "medusa_order_events", "fulfillment_tracking_events",
  "advertiser_accounts", "ad_campaigns", "ad_creatives", "ad_watch_sessions", "ad_watch_events", "ad_reward_confirmations", "ad_budget_ledger", "ad_fraud_events",
  "ai_stories", "ai_story_generations", "ai_story_usage_events", "ai_story_promotion_events",
  "dream_projects", "dream_pledges", "dream_contributions", "dream_reward_claims",
  "support_tickets", "support_messages", "notifications", "notification_deliveries",
  "risk_events", "device_fingerprints", "captcha_verifications", "auth_security_events", "compliance_checks", "sanctions_screening_events", "geo_policy_events", "audit_logs",
  "system_settings", "system_readiness_checks", "background_jobs", "webhook_delivery_attempts",
];

const requiredFunctions = [
  "app_public.dbx_bootstrap_first_owner_user",
  "app_public.get_or_create_wallet",
  "app_public.record_wallet_ledger_entry",
  "app_public.record_idempotency_key",
  "app_public.record_stripe_webhook_event",
  "app_public.record_economic_event",
  "app_public.set_updated_at",
];

requireText("sql_table", sql, requiredTables);
requireText("sql_function", sql, requiredFunctions);

const forbiddenSql = "DROP" + " TABLE";
if (sql.toUpperCase().includes(forbiddenSql)) blockers.push("migration_contains_forbidden_table_drop");

const rawSecretPatterns = [
  /postgres(?:ql)?:\/\/[^\s<]+/i,
  /sk_(?:test|live)_[A-Za-z0-9]{12,}/,
  /rk_(?:test|live)_[A-Za-z0-9]{12,}/,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s<]+/,
  /DATABASE_URL\s*=\s*[^\s<]+/,
];
for (const [label, text] of [["sql", sql], ["medusa_doc", medusaDoc], ["operator_doc", operatorDoc], ["inventory_doc", inventoryDoc]]) {
  if (rawSecretPatterns.some((pattern) => pattern.test(text))) blockers.push(`${label}_contains_raw_secret_like_value`);
}

const medusaDocLower = medusaDoc.toLowerCase();
if (!medusaDocLower.includes("do not create medusa core tables in supabase")) {
  blockers.push("medusa_doc_missing_do_not_create_core_tables_warning");
}
requireText("medusa_doc_command", medusaDoc, [
  "pnpm --filter @dbaronx/medusa run db:prepare",
  "pnpm --filter @dbaronx/medusa run launch-commerce:ensure",
  "DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa run first-product:reseed:canonical",
]);
requireText("sql_durable_stripe", sql, ["stripe_webhook_events", "stripe_event_id", "checkout_session_id", "record_stripe_webhook_event"]);
requireText("sql_economic_events", sql, ["economic_events", "economic_event_outbox", "record_economic_event"]);
requireText("sql_first_owner_rpc", sql, ["dbx_bootstrap_first_owner_user", "platformUserId", "firstUserNumber", "ownerReferenceId", "referralLinkPath", "initiationLinkPath", "walletId", "affiliateAccountId"]);

const result = {
  success: blockers.length === 0,
  blockers,
  migrationPath: "supabase/migrations/202605140001_complete_dbaronx_application_schema.sql",
  checkedTables: requiredTables.length,
  checkedFunctions: requiredFunctions.length,
};
console.log(JSON.stringify(result, null, 2));
if (blockers.length > 0) process.exit(1);
