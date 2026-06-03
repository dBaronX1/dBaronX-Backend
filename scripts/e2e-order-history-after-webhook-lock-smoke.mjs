#!/usr/bin/env node
import { read, assert } from './e2e-production-lock-helpers.mjs';
const stripe = read('apps/api/src/modules/payments/stripe-checkout.service.ts');
const orders = read('apps/api/src/modules/payments/order-fulfillment.service.ts');
const controller = read('apps/api/src/modules/payments/orders-status.controller.ts');
assert(/handleWebhook/.test(stripe) && /constructEvent/.test(stripe), 'signed Stripe webhook verification missing');
assert(/upsertCustomerOrderAndFulfillmentTask/.test(stripe) && /payment_status:\s*["']paid_verified/.test(stripe), 'verified webhook order upsert missing');
assert(/line_items/.test(stripe + orders) && /shipping_address/.test(stripe), 'order line items or shipping details not stored');
assert(/fulfillment_tasks/.test(stripe) && /queued_manual_review/.test(stripe), 'manual fulfillment task creation missing');
assert(/@Get\(":reference"\)/.test(controller) && /path: "payment"/.test(controller) && /path: "order"/.test(controller), 'customer order/payment status reference routes missing');
assert(/paymentStatus/.test(orders) && /pending_verification/.test(stripe) && /paid_verified/.test(orders), 'safe payment status response missing');
console.log('order history after webhook lock smoke passed');
