#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const SECRET_KEYS = /TOKEN|KEY|SECRET|DATABASE_URL|SERVICE_ROLE/i;

function env(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function boolEnv(name, fallback = false) {
  const raw = env(name).toLowerCase();
  if (!raw) return fallback;
  return ["1", "true", "yes", "on"].includes(raw);
}

function intEnv(name, fallback) {
  const value = Number.parseInt(env(name), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function printJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function publicBlocker(message) {
  return String(message || "unknown_blocker").replace(/[A-Za-z0-9_\-]{24,}/g, "[redacted]");
}

function requireEnv() {
  const missing = [];
  for (const name of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!env(name)) missing.push(name);
  }
  if (!env("CJ_ACCESS_TOKEN") && !env("CJ_API_KEY") && !env("CJ_SYNC_INPUT_FILE")) {
    missing.push("CJ_ACCESS_TOKEN_or_CJ_API_KEY_or_CJ_SYNC_INPUT_FILE");
  }
  return missing;
}

function slugify(value) {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || "cj-product";
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function arrayFrom(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
}

function collectImages(raw) {
  const images = [];
  const candidates = [
    raw.images,
    raw.productImages,
    raw.productImageSet,
    raw.imageUrls,
    raw.variants,
    raw.variantList,
    raw.skuList,
  ];
  for (const candidate of candidates) {
    for (const item of arrayFrom(candidate)) {
      if (typeof item === "string") images.push(item);
      if (item && typeof item === "object") {
        const obj = item;
        images.push(firstString(obj.url, obj.image, obj.imageUrl, obj.productImage, obj.variantImage, obj.thumbnail));
      }
    }
  }
  images.push(firstString(raw.thumbnail, raw.image, raw.imageUrl, raw.productImage, raw.productImageUrl));
  return [...new Set(images.map((item) => String(item || "").trim()).filter(Boolean))];
}

function moneyToMinor(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number * 100);
}

function normalizeStock(raw) {
  const quantityValue = firstString(raw.inventoryQuantity, raw.inventory, raw.stock, raw.totalInventory, raw.quantity, raw.availableQuantity);
  const quantity = quantityValue ? Number.parseInt(quantityValue, 10) : null;
  const hasQuantity = Number.isFinite(quantity);
  const statusText = firstString(raw.stockStatus, raw.productStatus, raw.status).toLowerCase();
  let stock_status = "unknown";
  if (hasQuantity && quantity > 10) stock_status = "in_stock";
  else if (hasQuantity && quantity > 0) stock_status = "limited";
  else if (hasQuantity && quantity <= 0) stock_status = "out_of_stock";
  else if (/in[_ -]?stock|available|listed|sell/i.test(statusText)) stock_status = "in_stock";
  else if (/out|sold|offline|unavailable/i.test(statusText)) stock_status = "out_of_stock";
  return { inventory_quantity: hasQuantity ? quantity : null, stock_status };
}

function normalizeCjProduct(raw, index, options) {
  const supplierProductId = firstString(raw.pid, raw.productId, raw.productID, raw.id, raw.cjProductId, raw.vid, raw.spu);
  const supplierSku = firstString(raw.sku, raw.skuId, raw.variantSku, raw.productSku, raw.supplierSku, raw.variantId);
  const title = firstString(raw.productName, raw.name, raw.title, raw.productTitle, raw.enName);
  const description = firstString(raw.description, raw.productDescription, raw.desc, raw.remark, raw.shortDescription);
  const images = collectImages(raw);
  const costMinor = moneyToMinor(firstString(raw.sellPrice, raw.cost, raw.costPrice, raw.supplierPrice, raw.factoryPrice, raw.price));
  const priceMinor = moneyToMinor(firstString(raw.retailPrice, raw.salePrice, raw.listPrice, raw.displayPrice, raw.price));
  const currency = firstString(raw.currency, raw.currencyCode, raw.currency_code, options.defaultCurrency).toLowerCase() || "usd";
  const stock = normalizeStock(raw);
  const medusaVariantId = firstString(raw.medusa_variant_id, raw.medusaVariantId);
  const verification = verifyProduct({ title, images, priceMinor, costMinor, medusaVariantId }, options);
  const handleBase = slugify(firstString(raw.handle, title, supplierSku, supplierProductId, `cj-product-${index + 1}`));
  const handleSuffix = supplierProductId || supplierSku || String(index + 1);
  return {
    source: options.inputFile ? "cj_json_import" : "cj_api",
    supplier: "cj",
    supplier_product_id: supplierProductId || `missing-id-${Date.now()}-${index}`,
    supplier_sku: supplierSku || null,
    medusa_product_id: firstString(raw.medusa_product_id, raw.medusaProductId) || null,
    medusa_variant_id: medusaVariantId || null,
    handle: supplierProductId || supplierSku ? `${handleBase}-${slugify(handleSuffix).slice(-24)}` : handleBase,
    title: title || `CJ product ${index + 1}`,
    description: description || null,
    short_description: firstString(raw.shortDescription, raw.short_description) || null,
    thumbnail: images[0] || null,
    image_url: images[0] || null,
    images,
    price_minor: priceMinor,
    compare_at_price_minor: moneyToMinor(firstString(raw.compareAtPrice, raw.originalPrice, raw.listPrice)),
    cost_minor: costMinor,
    currency_code: currency,
    inventory_quantity: stock.inventory_quantity,
    stock_status: stock.stock_status,
    delivery_estimate: firstString(raw.deliveryEstimate, raw.deliveryTime, raw.shippingTime, raw.shippingEstimate) || null,
    shipping_country: firstString(raw.shippingCountry, raw.shipFrom, raw.country, raw.shippingFrom) || null,
    category: firstString(raw.category, raw.categoryName, raw.productType) || null,
    tags: arrayFrom(raw.tags).filter((tag) => typeof tag === "string" && tag.trim()).map((tag) => tag.trim()).slice(0, 20),
    metadata: {
      cjSyncSource: options.inputFile ? "local_json" : "cj_api",
      checkoutSafety: medusaVariantId ? "medusa_variant_present" : "checkout_disabled_no_medusa_variant",
    },
    cj_raw: raw,
    verification_status: verification.status,
    active: verification.status === "verified",
    checkout_enabled: verification.status === "verified" && Boolean(medusaVariantId),
    synced_at: new Date().toISOString(),
  };
}

function verifyProduct(input, options) {
  if (!options.autoVerify) return { status: "draft", blockers: [] };
  const blockers = [];
  if (!input.title) blockers.push("title_missing");
  if (!input.images.length) blockers.push("image_missing");
  if (!input.priceMinor || input.priceMinor <= 0) blockers.push("price_missing");
  if (!input.medusaVariantId) blockers.push("medusa_variant_id_missing_for_checkout");
  if (options.minMarginPercent && input.priceMinor && input.costMinor) {
    const margin = ((input.priceMinor - input.costMinor) / input.priceMinor) * 100;
    if (margin < options.minMarginPercent) blockers.push("minimum_margin_not_met");
  }
  return { status: blockers.length === 0 ? "verified" : "pending_review", blockers };
}

function extractCjItems(payload) {
  if (Array.isArray(payload)) return payload;
  const root = payload && typeof payload === "object" ? payload : {};
  const data = root.data && typeof root.data === "object" ? root.data : root;
  for (const key of ["list", "products", "items", "records", "content"]) {
    if (Array.isArray(data[key])) return data[key];
  }
  return [];
}

async function fetchFromCj(options) {
  const baseUrl = env("CJ_API_BASE_URL", "https://developers.cjdropshipping.com/api2.0").replace(/\/+$/, "");
  const token = env("CJ_ACCESS_TOKEN") || env("CJ_API_KEY");
  const url = new URL(`${baseUrl}/v1/product/list`);
  url.searchParams.set("pageNum", "1");
  url.searchParams.set("pageSize", String(options.limit));
  if (env("CJ_SYNC_QUERY")) url.searchParams.set("productName", env("CJ_SYNC_QUERY"));
  if (env("CJ_SYNC_CATEGORY_ID")) url.searchParams.set("categoryId", env("CJ_SYNC_CATEGORY_ID"));
  const response = await fetch(url, { headers: { "CJ-Access-Token": token, accept: "application/json" } });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`cj_api_failed_${response.status}`);
  return extractCjItems(payload);
}

async function loadProducts(options) {
  if (options.inputFile) {
    const payload = JSON.parse(await readFile(options.inputFile, "utf8"));
    return extractCjItems(payload);
  }
  return fetchFromCj(options);
}

async function createSession(supabase, options, blockers) {
  if (options.dryRun) return { id: "dry-run-session" };
  const { data, error } = await supabase
    .schema("app_public")
    .from("supplier_sync_sessions")
    .insert({ supplier: "cj", status: "started", source: options.inputFile ? "local_json" : "cj_api", requested_by: env("CJ_SYNC_REQUESTED_BY", "script"), blockers, metadata: { dryRun: false } })
    .select("id")
    .single();
  if (error) throw new Error(`supplier_sync_session_insert_failed:${error.message}`);
  return data;
}

async function finishSession(supabase, sessionId, status, totals, blockers, options) {
  if (options.dryRun || sessionId === "dry-run-session") return;
  await supabase
    .schema("app_public")
    .from("supplier_sync_sessions")
    .update({ status, ...totals, blockers, finished_at: new Date().toISOString() })
    .eq("id", sessionId);
}

async function upsertProducts(supabase, products, options) {
  if (options.dryRun || products.length === 0) return { totalUpserted: 0 };
  const { error } = await supabase
    .schema("app_public")
    .from("storefront_products")
    .upsert(products, { onConflict: "supplier,supplier_product_id" });
  if (error) throw new Error(`storefront_products_upsert_failed:${error.message}`);
  return { totalUpserted: products.length };
}

async function main() {
  const missing = requireEnv();
  const options = {
    limit: intEnv("CJ_SYNC_LIMIT", 50),
    dryRun: boolEnv("CJ_SYNC_DRY_RUN", false),
    autoVerify: boolEnv("CJ_SYNC_AUTO_VERIFY", false),
    minMarginPercent: Number(env("CJ_SYNC_MIN_MARGIN_PERCENT") || 0),
    defaultCurrency: env("CJ_SYNC_DEFAULT_CURRENCY", "usd"),
    inputFile: env("CJ_SYNC_INPUT_FILE"),
  };
  const blockers = missing.map((name) => `${name.toLowerCase()}_missing`);
  if (missing.length) {
    printJson({ success: false, sessionId: null, totalSeen: 0, totalUpserted: 0, totalVerified: 0, totalRejected: 0, blockers, nextManualStep: "Set server-side Supabase service-role and CJ credentials, or provide CJ_SYNC_INPUT_FILE for manual JSON import." });
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
  let sessionId = null;
  try {
    const session = await createSession(supabase, options, blockers);
    sessionId = session.id;
    const rawProducts = (await loadProducts(options)).slice(0, options.limit);
    const normalized = rawProducts.map((item, index) => normalizeCjProduct(item, index, options));
    const productBlockers = normalized.flatMap((product) => {
      const out = [];
      if (!product.supplier_product_id || product.supplier_product_id.startsWith("missing-id")) out.push(`product_${product.handle}_supplier_product_id_missing`);
      if (!product.title) out.push(`product_${product.handle}_title_missing`);
      if (!product.images.length) out.push(`product_${product.handle}_image_missing`);
      if (product.checkout_enabled && !product.medusa_variant_id) out.push(`product_${product.handle}_checkout_enabled_without_variant`);
      return out;
    });
    blockers.push(...productBlockers);
    const upsert = await upsertProducts(supabase, normalized, options);
    const totals = {
      total_seen: rawProducts.length,
      total_upserted: upsert.totalUpserted,
      total_verified: normalized.filter((item) => item.verification_status === "verified").length,
      total_rejected: normalized.filter((item) => item.verification_status === "rejected").length,
    };
    await finishSession(supabase, sessionId, blockers.length ? "completed_with_blockers" : "completed", totals, blockers, options);
    printJson({ success: blockers.length === 0, sessionId, totalSeen: totals.total_seen, totalUpserted: totals.total_upserted, totalVerified: totals.total_verified, totalRejected: totals.total_rejected, blockers: blockers.map(publicBlocker), nextManualStep: "Review draft/pending CJ products in app_public.storefront_products; set verification_status='verified' and active=true only after product, price, shipping, stock, and Medusa checkout variant are verified." });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    blockers.push(publicBlocker(message));
    if (sessionId) await finishSession(supabase, sessionId, "failed", { total_seen: 0, total_upserted: 0, total_verified: 0, total_rejected: 0 }, blockers, options).catch(() => undefined);
    printJson({ success: false, sessionId, totalSeen: 0, totalUpserted: 0, totalVerified: 0, totalRejected: 0, blockers: blockers.map(publicBlocker), nextManualStep: "Resolve blockers and rerun. Do not publish products until verification is complete." });
    process.exitCode = 1;
  }
}

for (const key of Object.keys(process.env)) {
  if (SECRET_KEYS.test(key) && process.env[key]) process.env[key] = process.env[key];
}

main();
