#!/usr/bin/env node
import { read, assert } from './e2e-production-lock-helpers.mjs';
const stripe = read('apps/api/src/modules/payments/stripe-checkout.service.ts');
const controller = read('apps/api/src/modules/payments/checkout-session.controller.ts');
assert(/stripe\.checkout\.sessions\.create/.test(stripe), 'Stripe hosted Checkout Session creation missing');
assert(/line_items:\s*payload\.lineItems\.map/.test(stripe), 'Stripe multi-line lineItems mapping missing');
assert(!/createSession[\s\S]{0,9000}payment_status:\s*["']paid_verified/.test(stripe), 'Stripe session creation must not mark paid');
assert(/payment\/success\?checkout_ref=/.test(stripe) || /success_url:\s*payload\.successUrl/.test(stripe), 'Stripe success URL must preserve hosted return to payment success');
assert(/checkoutRef:\s*input\.checkoutRef/.test(stripe) && /cartId:\s*input\.cartId/.test(stripe), 'checkout_ref/cart reference metadata not preserved');
assert(/selectedLineItemKeys/.test(stripe) && /lineItemCount/.test(stripe), 'selected cart metadata not preserved');
assert(!/Multi-item checkout is not supported yet|lineItems\.slice\(0,\s*1\)|line_items:\s*\[[^\]]*payload\.lineItems\[0\]/.test(stripe + controller), 'one-item-only checkout blocker detected');
assert(!/payment_status:\s*["']paid_verified["'][\s\S]{0,1200}createSession/.test(stripe), 'fake success regression detected');
assert(!/cardNumber|card_number|elements\.create\(["']card|PaymentElement/.test(controller), 'direct card collection regression detected');
console.log('stripe current success lock smoke passed');
