#!/usr/bin/env node
import { read, assert } from './e2e-production-lock-helpers.mjs';
const orders = read('apps/api/src/modules/payments/order-fulfillment.service.ts');
const stripe = read('apps/api/src/modules/payments/stripe-checkout.service.ts');
assert(/clearPurchasedCartItems:\s*paymentStatus === "paid_verified"/.test(orders), 'cart clear signal must require paid_verified');
assert(/purchasedLineItemKeys/.test(orders) && /derivePurchasedLineItemKeys/.test(stripe), 'purchased selected line item keys missing');
assert(!/clearPurchasedCartItems:\s*true/.test(orders), 'cart clear must not be unconditional on redirect');
console.log('cart clear after verified payment lock smoke passed');
