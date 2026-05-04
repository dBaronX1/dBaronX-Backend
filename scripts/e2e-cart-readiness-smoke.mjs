#!/usr/bin/env node

const baseUrl = (process.env.MEDUSA_BACKEND_URL || process.env.MEDUSA_URL || "http://localhost:9000").replace(/\/$/, "");
const publishableKey = process.env.MEDUSA_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

const headers = publishableKey ? { "x-publishable-api-key": publishableKey } : {};
const blockers = [];
if (!publishableKey) blockers.push("missing_publishable_key");

async function getJson(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  return { ok: response.ok, status: response.status, json };
}

const result = { success: false, baseUrl, blockers, regionId: null, productId: null, variantId: null, cartId: null, lineItemAdded: false, nextBlocker: null };

try {
  const productsRes = await getJson("/store/products?limit=20", { headers });
  const products = Array.isArray(productsRes.json?.products) ? productsRes.json.products : [];
  const product = products.find((p) => Array.isArray(p?.variants) && p.variants.length > 0);
  const variant = product?.variants?.[0];

  result.productId = product?.id || null;
  result.variantId = variant?.id || null;

  if (!productsRes.ok) blockers.push(`store_products_http_${productsRes.status}`);
  if (!product) blockers.push("no_product_with_variant");
  if (!variant?.id) blockers.push("variant_id_missing");

  const regionsRes = await getJson("/store/regions?limit=20", { headers });
  const regions = Array.isArray(regionsRes.json?.regions) ? regionsRes.json.regions : [];
  const region = regions.find((r) => r?.id) || null;
  result.regionId = region?.id || null;
  if (!region?.id) blockers.push("region_missing");

  if (result.variantId && region?.id) {
    const cartRes = await getJson("/store/carts", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ region_id: region.id }),
    });

    if (!cartRes.ok || !cartRes.json?.cart?.id) {
      blockers.push(`cart_create_http_${cartRes.status}`);
      result.nextBlocker = cartRes.json?.message || cartRes.json?.type || "cart_create_failed";
    } else {
      result.cartId = cartRes.json.cart.id;
      const lineItemRes = await getJson(`/store/carts/${result.cartId}/line-items`, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({ variant_id: result.variantId, quantity: 1 }),
      });

      if (!lineItemRes.ok) {
        blockers.push(`line_item_add_http_${lineItemRes.status}`);
        result.nextBlocker = lineItemRes.json?.message || lineItemRes.json?.type || "line_item_add_failed";
      } else {
        result.lineItemAdded = true;
        const shippingOptionsRes = await getJson(`/store/shipping-options?cart_id=${result.cartId}`, { headers });
        const shippingOptions = Array.isArray(shippingOptionsRes.json?.shipping_options) ? shippingOptionsRes.json.shipping_options : [];
        if (!shippingOptionsRes.ok || shippingOptions.length === 0) {
          blockers.push("shipping_option_missing");
          result.nextBlocker = shippingOptionsRes.json?.message || "shipping_option_missing";
        } else {
          result.nextBlocker = "payment_session_required";
        }
      }
    }
  }

  result.success = blockers.length === 0;
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
} catch (error) {
  console.log(JSON.stringify({ ...result, blockers: [...blockers, "unexpected_error"], error: String(error) }, null, 2));
  process.exit(1);
}
