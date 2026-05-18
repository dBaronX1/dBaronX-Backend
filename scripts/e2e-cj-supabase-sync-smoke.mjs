#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";

const checks = [];
function check(name, pass, detail = "") {
  checks.push({ name, pass, detail });
}
function contains(file, patterns) {
  const text = readFileSync(file, "utf8");
  return patterns.every((pattern) => (pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern)));
}

const migration = "supabase/migrations/202605180001_supabase_storefront_products_cj_sync.sql";
const script = "scripts/sync-cj-products-to-supabase.mjs";
check("migration exists", existsSync(migration));
check("sync script exists", existsSync(script));
check("script requires service role and CJ env", contains(script, ["SUPABASE_SERVICE_ROLE_KEY", /CJ_ACCESS_TOKEN.*CJ_API_KEY/s]));
check("script supports dry run", contains(script, ["CJ_SYNC_DRY_RUN", "dry-run-session"]));
check("script writes supplier_sync_sessions", contains(script, ["supplier_sync_sessions", "insert({ supplier: \"cj\""]));
check("script upserts storefront_products", contains(script, ["storefront_products", ".upsert(products"]));
check("script does not auto-activate drafts", contains(script, ["CJ_SYNC_AUTO_VERIFY", "active: verification.status === \"verified\"", "checkout_enabled: verification.status === \"verified\" && Boolean(medusaVariantId)"]));
check("migration locks public visibility to active verified", contains(migration, ["active = true and verification_status = 'verified'", "to anon, authenticated"]));

const failed = checks.filter((item) => !item.pass);
console.log(JSON.stringify({ success: failed.length === 0, checks, failed }, null, 2));
if (failed.length) process.exit(1);
