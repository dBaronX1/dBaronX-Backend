#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const blockers = [];
const apiDto = await readFile('apps/api/src/modules/payments/dto/create-stripe-checkout-session.dto.ts', 'utf8');
const apiService = await readFile('apps/api/src/modules/payments/stripe-checkout.service.ts', 'utf8');
const webCheckout = await readFile('apps/web/src/components/dbx/StripeCheckoutPanel.tsx', 'utf8');
const webStripe = await readFile('apps/web/src/lib/checkout/stripe.ts', 'utf8');
const productViews = await readFile('apps/web/src/components/dbx/ProductViews.tsx', 'utf8');

for (const field of ['productId', 'variantId', 'priceMinor', 'unitPriceMinor', 'quantity', 'customerEmail', 'country', 'city', 'addressLine1', 'postalCode']) {
  if (!apiDto.includes(field)) blockers.push(`api_dto_missing_${field}`);
}
if (!apiService.includes('input.productId ?? input.product_id') || !apiService.includes('input.variantId ?? input.variant_id')) blockers.push('api_checkout_identity_normalization_missing');
if (!apiService.includes('input.priceMinor') || !apiService.includes('amount_mismatch')) blockers.push('api_checkout_price_guard_missing');
if (!webCheckout.includes('createStripeCheckoutSession') || !webCheckout.includes('variantId') || !webCheckout.includes('priceMinor') || !webCheckout.includes('customerEmail')) blockers.push('rocket_checkout_payload_not_normalized');
if (!webStripe.includes('/api/checkout/session')) blockers.push('rocket_checkout_not_using_nest_checkout_gateway');
if (!productViews.includes('data-default-variant-id={variantId}') || !productViews.includes('/checkout?variant=')) blockers.push('product_buy_now_not_using_normalized_variant');
console.log(JSON.stringify({ success: blockers.length === 0, blockers }, null, 2));
process.exit(blockers.length ? 1 : 0);
