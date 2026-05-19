#!/usr/bin/env node


async function loadSupabaseCreateClient() {
  try {
    const mod = await import("@supabase/supabase-js");
    return mod.createClient;
  } catch (error) {
    const fallback = await import("../apps/api/node_modules/@supabase/supabase-js/dist/index.cjs");
    return fallback.createClient || fallback.default?.createClient;
  }
}

function env(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function assertServerRuntime() {
  if (typeof globalThis.window !== "undefined" || typeof globalThis.document !== "undefined") {
    throw new Error("server_side_only_storefront_product_approval");
  }
}

function argValue(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return String(process.argv[index + 1] || "").trim();
  return "";
}

function printJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function requireEnv() {
  return ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((name) => !env(name));
}

function selector() {
  const productId = env("SUPABASE_PRODUCT_ID") || argValue("product-id");
  const supplierProductId = env("SUPABASE_SUPPLIER_PRODUCT_ID") || argValue("supplier-product-id");
  const handle = env("SUPABASE_PRODUCT_HANDLE") || argValue("handle");
  if (productId) return { column: "id", value: productId };
  if (supplierProductId) return { column: "supplier_product_id", value: supplierProductId };
  if (handle) return { column: "handle", value: handle };
  return null;
}

async function main() {
  assertServerRuntime();
  const missing = requireEnv();
  const where = selector();
  if (!where) missing.push("SUPABASE_PRODUCT_ID_or_SUPABASE_SUPPLIER_PRODUCT_ID_or_SUPABASE_PRODUCT_HANDLE");
  if (missing.length) {
    printJson({
      success: false,
      blockers: missing.map((name) => `${name.toLowerCase()}_missing`),
      nextManualStep: "Set server-side Supabase service-role env vars and a product selector, then rerun after manual product review.",
    });
    process.exitCode = 1;
    return;
  }

  const createClient = await loadSupabaseCreateClient();
  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: product, error: selectError } = await supabase
    .schema("app_public")
    .from("storefront_products")
    .select("id, supplier, supplier_product_id, handle, title, medusa_variant_id")
    .eq(where.column, where.value)
    .single();
  if (selectError) throw new Error(`storefront_product_lookup_failed:${selectError.message}`);

  const checkoutEnabled = Boolean(product.medusa_variant_id);
  const { data: approved, error: updateError } = await supabase
    .schema("app_public")
    .from("storefront_products")
    .update({
      verification_status: "verified",
      active: true,
      checkout_enabled: checkoutEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", product.id)
    .select("id, supplier, supplier_product_id, handle, verification_status, active, checkout_enabled, medusa_variant_id")
    .single();
  if (updateError) throw new Error(`storefront_product_approval_failed:${updateError.message}`);

  printJson({
    success: true,
    approved,
    checkoutEnabled,
    nextManualStep: checkoutEnabled
      ? "Product is visible and checkout-enabled because a Medusa variant is linked; verify Rocket display with anon RLS."
      : "Product is visible for display only; keep checkout disabled until a real Medusa variant is linked.",
  });
}

main().catch((error) => {
  printJson({
    success: false,
    blockers: [error instanceof Error ? error.message.replace(/[A-Za-z0-9_\-]{24,}/g, "[redacted]") : "unknown_error"],
    nextManualStep: "Resolve approval blocker; do not publish or enable checkout without manual verification.",
  });
  process.exitCode = 1;
});
