#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

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
const helper = "scripts/approve-supabase-storefront-product.mjs";
const fixture = "scripts/fixtures/cj-first-shirt-product.json";

check("migration exists", existsSync(migration));
check("sync script exists", existsSync(script));
check("approval helper exists", existsSync(helper));
check("CJ first shirt fixture exists", existsSync(fixture));
check("script is server-side guarded", contains(script, ["server_side_only_cj_supabase_sync", "typeof globalThis.window"]));
check("script requires service role for writes and CJ env/input", contains(script, ["SUPABASE_SERVICE_ROLE_KEY", /CJ_ACCESS_TOKEN.*CJ_API_KEY/s, "CJ_SYNC_INPUT_FILE"]));
check("script supports dry run without Supabase writes", contains(script, ["CJ_SYNC_DRY_RUN", "dry-run-session", "options.dryRun ? null : createClient"]));
check("script writes supplier_sync_sessions", contains(script, ["supplier_sync_sessions", "insert({ supplier: \"cj\""]));
check("script upserts storefront_products", contains(script, ["storefront_products", ".upsert(products"]));
check("script keeps synced products inactive drafts by default", contains(script, ["if (!options.autoVerify) return { status: \"draft\"", "active: verification.status === \"verified\"", "checkout_enabled: verification.status === \"verified\" && Boolean(medusaVariantId)"]));
check("migration locks public visibility to active verified", contains(migration, ["active = true and verification_status = 'verified'", "to anon, authenticated"]));
check("approval helper uses service role and does not fake checkout", contains(helper, ["SUPABASE_SERVICE_ROLE_KEY", "server_side_only_storefront_product_approval", "const checkoutEnabled = Boolean(product.medusa_variant_id)"]));

const dryRun = spawnSync(process.execPath, [script], {
  env: {
    ...process.env,
    CJ_SYNC_DRY_RUN: "true",
    CJ_SYNC_INPUT_FILE: fixture,
  },
  encoding: "utf8",
});
check("fixture dry run succeeds without secrets", dryRun.status === 0, dryRun.stderr || dryRun.stdout);
if (dryRun.status === 0) {
  const output = JSON.parse(dryRun.stdout);
  check("fixture sync output remains draft inactive", output.totalSeen === 1 && output.totalVerified === 0 && output.totalUpserted === 0, dryRun.stdout);
}

const failed = checks.filter((item) => !item.pass);
console.log(JSON.stringify({ success: failed.length === 0, checks, failed }, null, 2));
if (failed.length) process.exit(1);
