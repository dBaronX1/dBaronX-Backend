#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';

const TARGET = {
  title: "Men's Cotton Linen Long Sleeve Casual Shirt",
  handle: 'mens-cotton-linen-long-sleeve-casual-shirt',
  supplier: 'cj',
  supplierProductId: '2408300732091605000',
  supplierSku: 'CJDS212420104DW',
  amount: 1999,
  currency: 'usd',
};

const API_BASE = (process.env.API_BASE_URL || process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');
const WEB_BASE = (process.env.WEB_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const FIRST_SALE_FALLBACK_ENABLED = String(process.env.DBX_FIRST_SALE_FALLBACK_ENABLED || 'true').toLowerCase() === 'true';

const blockers = [];
const output = {
  success: false,
  blockers,
  productVisible: false,
  productSource: 'app_public.storefront_products',
  checkoutAvailable: false,
  checkoutMode: 'unavailable',
  stripeSessionCreated: false,
  stripeCheckoutUrlPresent: false,
  webhookEndpointConfigured: false,
  paymentProofStorageReady: false,
  telegramPaymentStatusSafe: false,
  telegramOrderStatusSafe: false,
  fakePaidBlocked: false,
  fakeFulfilledBlocked: false,
  nextManualStep: ''
};

const safeSql = `insert into app_public.storefront_products (title, handle, supplier, supplier_product_id, supplier_sku, source_url, image_url, cost_minor, selling_price_minor, currency, stock_qty, shipping_country, delivery_estimate, verification_status, active, checkout_enabled) values ('Men''s Cotton Linen Long Sleeve Casual Shirt', 'mens-cotton-linen-long-sleeve-casual-shirt', 'cj', '2408300732091605000', 'CJDS212420104DW', 'https://cjdropshipping.com/product/new-mens-casual-blouse-cotton-linen-shirt-loose-tops-long-sleeve-tee-shirt-spring-autumn-casual-handsome-mens-shirts-p-2408300732091605000.html', 'https://oss-cf.cjdropshipping.com/product/2024/08/30/07/ada82fd9-6efb-4629-86e8-1112d16a7a35.jpg?x-oss-process=image%2Fformat%2Cwebp', 419, 1999, 'usd', 32, 'US', '7-15 business days', 'verified', true, false) on conflict (supplier, supplier_product_id) do update set title=excluded.title, handle=excluded.handle, supplier_sku=excluded.supplier_sku, source_url=excluded.source_url, image_url=excluded.image_url, cost_minor=excluded.cost_minor, selling_price_minor=excluded.selling_price_minor, currency=excluded.currency, stock_qty=excluded.stock_qty, shipping_country=excluded.shipping_country, delivery_estimate=excluded.delivery_estimate, verification_status='verified', active=true;`;

try {
  const storefrontRes = await fetch(`${API_BASE}/api/storefront/products?handle=${encodeURIComponent(TARGET.handle)}&limit=5`, { headers: { accept: 'application/json' }});
  if (storefrontRes.ok) {
    const storefrontJson = await storefrontRes.json();
    const rows = Array.isArray(storefrontJson?.products) ? storefrontJson.products : [];
    const target = rows.find((row) => String(row?.handle || '') === TARGET.handle || String(row?.supplierProductId || '') === TARGET.supplierProductId);
    output.productVisible = Boolean(target);
    if (!target) {
      blockers.push('supabase_storefront_product_missing');
      output.nextManualStep = `Insert the verified CJ row first (safe SQL): ${safeSql}`;
    } else {
      const hasVariant = Boolean(target?.medusaVariantId || target?.medusa_variant_id);
      output.checkoutMode = hasVariant ? 'medusa_backed' : 'stripe_first_sale_fallback';
      output.checkoutAvailable = hasVariant || FIRST_SALE_FALLBACK_ENABLED;
      if (!hasVariant && !FIRST_SALE_FALLBACK_ENABLED) blockers.push('medusa_variant_missing_and_fallback_disabled');
      if (!hasVariant && FIRST_SALE_FALLBACK_ENABLED) blockers.push('Use Stripe first-sale fallback.');
    }
  } else {
    blockers.push('storefront_products_endpoint_unreachable');
    output.nextManualStep = 'Use direct Stripe checkout link + Telegram/support for first sale.';
  }
} catch {
  blockers.push('storefront_products_endpoint_unreachable');
  output.nextManualStep = 'Use direct Stripe checkout link + Telegram/support for first sale.';
}

if (output.checkoutAvailable) {
  try {
    const body = {
      cartId: `first-sale-${Date.now()}`,
      amount: TARGET.amount,
      currency: TARGET.currency,
      successUrl: `${WEB_BASE}/checkout/success`,
      cancelUrl: `${WEB_BASE}/checkout/cancel`,
      productName: TARGET.title,
      checkoutMode: 'test',
      metadataSource: 'dbaronx_first_sale',
      supplier: TARGET.supplier,
      supplierProductId: TARGET.supplierProductId,
      supplierSku: TARGET.supplierSku,
      handle: TARGET.handle,
      productId: TARGET.supplierProductId,
      variantId: TARGET.supplierSku,
    };
    const sessionRes = await fetch(`${API_BASE}/api/checkout/stripe/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const sessionJson = await sessionRes.json().catch(() => ({}));
    output.stripeSessionCreated = Boolean(sessionJson?.success && sessionJson?.sessionId);
    output.stripeCheckoutUrlPresent = Boolean(sessionJson?.checkoutUrl);
    if (!output.stripeSessionCreated) blockers.push('stripe_session_not_created');
  } catch {
    blockers.push('stripe_session_endpoint_unreachable');
  }
}

try {
  const readiness = await fetch(`${API_BASE}/api/checkout/stripe/readiness`, { headers: { accept: 'application/json' }});
  const json = readiness.ok ? await readiness.json() : {};
  output.webhookEndpointConfigured = Boolean(json?.webhookConfigured ?? json?.webhookEndpointReady ?? false);
  output.paymentProofStorageReady = Boolean(json?.paymentProofStorageReady ?? json?.settlementStorageReady ?? false);
} catch {
  blockers.push('stripe_readiness_unreachable');
}

const customerHandlerPath = 'apps/telegram-bot/src/handlers/customer_handler.py';
if (existsSync(customerHandlerPath)) {
  const source = readFileSync(customerHandlerPath, 'utf8');
  output.telegramPaymentStatusSafe = source.includes('Safe statuses: pending_verification, paid_verified, not_found, support_required') && source.includes('Paid: true (backend proof)');
  output.telegramOrderStatusSafe = source.includes('Safe status: support_required') && source.includes('never claims fulfillment for customers');
  output.fakePaidBlocked = source.includes('pending_verification') && source.includes('paid_verified');
  output.fakeFulfilledBlocked = source.includes('FULFILLMENT_PROOF_RULE');
}

if (!output.telegramPaymentStatusSafe) blockers.push('telegram_payment_status_safety_not_proven');
if (!output.telegramOrderStatusSafe) blockers.push('telegram_order_status_safety_not_proven');

if (!output.nextManualStep) {
  output.nextManualStep = output.stripeCheckoutUrlPresent
    ? 'Open the returned Stripe Checkout URL, pay with a Stripe test card, then verify settlement via /api/checkout/stripe/settlement-status and Telegram /payment_status.'
    : 'Use Stripe first-sale fallback.';
}

output.success = Boolean(
  output.productVisible &&
  output.checkoutAvailable &&
  output.stripeSessionCreated &&
  output.stripeCheckoutUrlPresent &&
  output.webhookEndpointConfigured &&
  output.paymentProofStorageReady &&
  output.telegramPaymentStatusSafe &&
  output.telegramOrderStatusSafe &&
  output.fakePaidBlocked &&
  output.fakeFulfilledBlocked
);

console.log(JSON.stringify(output, null, 2));
