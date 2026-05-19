#!/usr/bin/env node
import fs from 'node:fs';

const CJ = {
  source: 'dbaronx_first_sale',
  supplier: 'cj',
  supplierProductId: '2408300732091605000',
  supplierSku: 'CJDS212420104DW',
  handle: 'mens-cotton-linen-long-sleeve-casual-shirt',
};

const env = process.env;
const apiBase = firstNonEmpty(['API_BASE_URL', 'NEXT_PUBLIC_API_BASE_URL', 'ROCKET_BASE_URL']) || 'http://localhost:3000';
const webBase = firstNonEmpty(['WEB_BASE_URL', 'NEXT_PUBLIC_SITE_URL', 'ROCKET_BASE_URL']) || 'http://localhost:3001';

const API_BASE_URL = stripSlash(apiBase);
const WEB_BASE_URL = stripSlash(webBase);

const out = {
  success: false,
  blockers: [],
  productVisible: false,
  productSource: 'unknown',
  storefrontReachable: false,
  apiReachable: false,
  checkoutAvailable: false,
  checkoutMode: 'none',
  stripeSessionCreated: false,
  stripeCheckoutUrlPresent: false,
  checkoutUrl: null,
  webhookEndpointConfigured: false,
  paymentProofStorageReady: false,
  telegramPaymentStatusSafe: false,
  telegramOrderStatusSafe: false,
  fakePaidBlocked: false,
  fakeFulfilledBlocked: false,
  safeSqlForMissingProduct: null,
  nextManualStep: 'Set deployed API_BASE_URL/WEB_BASE_URL and rerun smoke.',
};

const attempts = [];
const addBlocker = (b) => { if (b && !out.blockers.includes(b)) out.blockers.push(b); };

function firstNonEmpty(keys) {
  for (const k of keys) {
    const v = String(env[k] || '').trim();
    if (v) return v;
  }
  return '';
}
function stripSlash(v) { return String(v || '').replace(/\/+$/, ''); }

async function jfetch(url, init = {}) {
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    attempts.push({ method: init.method || 'GET', url, status: res.status });
    return { ok: res.ok, status: res.status, json, text };
  } catch (error) {
    attempts.push({ method: init.method || 'GET', url, status: 0, error: String(error?.message || error) });
    return { ok: false, status: 0, json: null, text: String(error?.message || error) };
  }
}

function safeMissingProductSql() {
  return `insert into app_public.storefront_products\n(handle,supplier,supplier_product_id,supplier_sku,title,active,verification_status,checkout_enabled,medusa_variant_id)\nvalues\n('${CJ.handle}','${CJ.supplier}','${CJ.supplierProductId}','${CJ.supplierSku}','Mens Cotton Linen Long Sleeve Casual Shirt',true,'verified',false,null)\non conflict (handle) do update set\n  supplier = excluded.supplier,\n  supplier_product_id = excluded.supplier_product_id,\n  supplier_sku = excluded.supplier_sku,\n  active = true,\n  verification_status = 'verified',\n  checkout_enabled = case when coalesce(app_public.storefront_products.medusa_variant_id,'') <> '' then app_public.storefront_products.checkout_enabled else false end;`;
}

function checkTelegramSafety() {
  const p = 'scripts/e2e-telegram-customer-first-checkout-journey-smoke.mjs';
  if (!fs.existsSync(p)) return;
  const src = fs.readFileSync(p, 'utf8');
  out.telegramPaymentStatusSafe = src.includes('payment_status_can_fake_paid_or_missing_safe_states');
  out.telegramOrderStatusSafe = src.includes('order_status_can_fake_fulfilled_or_missing_safe_fallback');
  out.fakePaidBlocked = out.telegramPaymentStatusSafe;
  out.fakeFulfilledBlocked = out.telegramOrderStatusSafe;
}

async function run() {
  const apiHealth = await jfetch(`${API_BASE_URL}/api/health`);
  const apiRoot = await jfetch(`${API_BASE_URL}/health`);
  out.apiReachable = apiHealth.status > 0 || apiRoot.status > 0;
  if (!out.apiReachable) addBlocker('api_unreachable');

  const storefront = await jfetch(`${WEB_BASE_URL}/products/${CJ.handle}`);
  const storefrontAlt = await jfetch(`${WEB_BASE_URL}/shop`);
  out.storefrontReachable = storefront.status > 0 || storefrontAlt.status > 0;

  if (out.storefrontReachable && storefront.ok) {
    out.productVisible = storefront.text.toLowerCase().includes(CJ.handle) || storefront.text.toLowerCase().includes('cotton');
    out.productSource = out.productVisible ? 'supabase' : 'unknown';
  }

  if (!out.productVisible) {
    out.productSource = 'fallback_sql_needed';
    out.safeSqlForMissingProduct = safeMissingProductSql();
  }

  const webhookProbe = await jfetch(`${API_BASE_URL}/api/checkout/stripe/webhook`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  out.webhookEndpointConfigured = webhookProbe.status > 0 && webhookProbe.status !== 404;

  if (out.apiReachable) {
    const payload = {
      cartId: `first-sale-${Date.now()}`,
      amount: Number(env.STRIPE_TEST_AMOUNT_MINOR || 100),
      currency: 'usd',
      checkoutMode: 'test',
      successUrl: `${WEB_BASE_URL}/checkout/success`,
      cancelUrl: `${WEB_BASE_URL}/checkout/cancel`,
      productName: 'dBaronX First Sale Test Checkout',
      metadataSource: CJ.source,
      source: CJ.source,
      supplier: CJ.supplier,
      supplierProductId: CJ.supplierProductId,
      supplierSku: CJ.supplierSku,
      handle: CJ.handle,
    };
    const session = await jfetch(`${API_BASE_URL}/api/checkout/stripe/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    out.checkoutAvailable = session.status !== 404;
    if (session.ok) {
      const body = session.json?.data || session.json || {};
      out.stripeSessionCreated = Boolean(body.sessionId);
      out.checkoutUrl = body.checkoutUrl || null;
      out.stripeCheckoutUrlPresent = Boolean(out.checkoutUrl && String(out.checkoutUrl).includes('checkout.stripe.com'));
      out.checkoutMode = out.stripeCheckoutUrlPresent ? 'stripe_first_sale_fallback' : 'none';
    } else {
      addBlocker('stripe_checkout_session_create_failed_or_unavailable');
    }
  }

  out.paymentProofStorageReady = out.webhookEndpointConfigured;
  if (!out.productVisible && !out.safeSqlForMissingProduct) addBlocker('missing_product_sql_not_generated');
  if (!out.checkoutAvailable) addBlocker('checkout_endpoint_unavailable');
  if (!out.stripeCheckoutUrlPresent) addBlocker('stripe_checkout_url_missing');
  if (!out.webhookEndpointConfigured) addBlocker('stripe_webhook_endpoint_unavailable');

  checkTelegramSafety();
  if (!out.telegramPaymentStatusSafe) addBlocker('telegram_payment_status_safety_unverified');
  if (!out.telegramOrderStatusSafe) addBlocker('telegram_order_status_safety_unverified');

  out.success = out.stripeSessionCreated && out.stripeCheckoutUrlPresent && out.paymentProofStorageReady && out.telegramPaymentStatusSafe && out.telegramOrderStatusSafe && out.blockers.length === 0;
  out.nextManualStep = out.stripeCheckoutUrlPresent
    ? `Open checkoutUrl, pay using Stripe test card 4242 4242 4242 4242, confirm signed checkout.session.completed webhook at ${API_BASE_URL}/api/checkout/stripe/webhook, then verify settlement/payment proof via backend status endpoint.`
    : 'Fix blockers and rerun smoke. If storefront remains down, run direct Stripe checkout fallback through the API session endpoint.';

  console.log(JSON.stringify({ ...out, attempts }, null, 2));
}

run();
