#!/usr/bin/env node

const TARGET = {
  title: "Men's Cotton Linen Long Sleeve Casual Shirt",
  handle: "mens-cotton-linen-long-sleeve-casual-shirt",
  supplier: "cj",
  supplierProductId: "2408300732091605000",
  supplierSku: "CJDS212420104DW",
  amount: 1999,
  currency: "usd",
};

function env(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

async function loadSupabaseCreateClient() {
  try {
    const mod = await import("@supabase/supabase-js");
    return mod.createClient;
  } catch {
    const fallback = await import("../apps/api/node_modules/@supabase/supabase-js/dist/index.cjs");
    return fallback.createClient || fallback.default?.createClient;
  }
}

function exactSafeSqlToApproveProductIfNeeded() {
  return `update app_public.storefront_products set verification_status = 'verified', active = true, price_minor = 1999, currency_code = 'usd', supplier = 'cj', supplier_product_id = '2408300732091605000', supplier_sku = 'CJDS212420104DW', updated_at = now() where handle = 'mens-cotton-linen-long-sleeve-casual-shirt';`;
}

async function main() {
  const blockers = [];
  const output = {
    success: false,
    productVisible: false,
    checkoutEnabled: false,
    medusaVariantIdPresent: false,
    firstSaleFallbackAllowed: false,
    stripeFallbackMetadataReady: true,
    blockers,
    exactSafeSqlToApproveProductIfNeeded: exactSafeSqlToApproveProductIfNeeded(),
  };

  const allowFlag = String(env("DBX_FIRST_SALE_FALLBACK_ENABLED", "true")).toLowerCase();
  output.firstSaleFallbackAllowed = ["1", "true", "yes", "on"].includes(allowFlag);

  if (!env("SUPABASE_URL") || !env("SUPABASE_SERVICE_ROLE_KEY")) {
    blockers.push("supabase_env_missing");
    output.success = false;
    console.log(JSON.stringify(output, null, 2));
    process.exitCode = 1;
    return;
  }

  const createClient = await loadSupabaseCreateClient();
  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .schema("app_public")
    .from("storefront_products")
    .select("handle,active,verification_status,price_minor,currency_code,supplier,supplier_product_id,supplier_sku,medusa_variant_id,checkout_enabled,title")
    .eq("handle", TARGET.handle)
    .maybeSingle();

  if (error) {
    blockers.push(`storefront_products_lookup_failed:${error.code || "unknown"}`);
    console.log(JSON.stringify(output, null, 2));
    process.exitCode = 1;
    return;
  }

  if (!data) {
    blockers.push("first_sale_product_missing");
    console.log(JSON.stringify(output, null, 2));
    process.exitCode = 1;
    return;
  }

  const titleMatches = String(data.title || "") === TARGET.title;
  const productMatches =
    data.handle === TARGET.handle &&
    String(data.supplier || "").toLowerCase() === TARGET.supplier &&
    String(data.supplier_product_id || "") === TARGET.supplierProductId &&
    String(data.supplier_sku || "") === TARGET.supplierSku;

  output.productVisible = Boolean(data.active === true && data.verification_status === "verified");
  output.checkoutEnabled = Boolean(data.checkout_enabled === true);
  output.medusaVariantIdPresent = Boolean(data.medusa_variant_id);
  output.stripeFallbackMetadataReady = Boolean(productMatches && titleMatches);

  if (Number(data.price_minor) !== TARGET.amount) blockers.push("price_minor_mismatch");
  if (String(data.currency_code || "").toLowerCase() !== TARGET.currency) blockers.push("currency_code_mismatch");
  if (!output.productVisible) blockers.push("product_not_active_verified");
  if (!productMatches) blockers.push("controlled_first_sale_metadata_mismatch");
  if (!output.firstSaleFallbackAllowed) blockers.push("first_sale_fallback_disabled");
  if (!output.medusaVariantIdPresent && !output.firstSaleFallbackAllowed) blockers.push("medusa_variant_required_when_fallback_disabled");

  output.success = output.productVisible && output.stripeFallbackMetadataReady && (output.checkoutEnabled || output.firstSaleFallbackAllowed);

  console.log(JSON.stringify(output, null, 2));
  if (!output.success) process.exitCode = 1;
}

main().catch((error) => {
  console.log(
    JSON.stringify(
      {
        success: false,
        productVisible: false,
        checkoutEnabled: false,
        medusaVariantIdPresent: false,
        firstSaleFallbackAllowed: false,
        stripeFallbackMetadataReady: false,
        blockers: [error instanceof Error ? error.message : "unknown_error"],
        exactSafeSqlToApproveProductIfNeeded: exactSafeSqlToApproveProductIfNeeded(),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
