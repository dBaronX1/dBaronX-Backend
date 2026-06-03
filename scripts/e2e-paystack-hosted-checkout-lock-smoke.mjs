#!/usr/bin/env node
import { read, assert } from './e2e-production-lock-helpers.mjs';
const paystack = read('apps/api/src/modules/payments/paystack-checkout.service.ts');
const controller = read('apps/api/src/modules/payments/checkout-session.controller.ts');
const resolver = read('apps/api/src/modules/payments/payment-mode-resolver.ts');
assert(/input\.lineItems \|\| input\.line_items \|\| input\.items \|\| input\.cartItems/.test(paystack), 'Paystack must accept Stripe-compatible lineItems aliases');
assert(/paymentProvider \|\| body\.provider \|\| body\.paymentMethod \|\| body\.payment_method \|\| body\.selectedPaymentMethod/.test(controller), 'provider alias resolver missing');
assert(/toMinorAmount/.test(paystack) && /Math\.round\(numeric \* 100\)/.test(paystack), 'decimal price to minor unit normalization missing');
assert(/checkout_ref:\s*reference/.test(paystack) && /cart_id:/.test(paystack), 'Paystack reference/cart metadata missing');
assert(/transaction\/initialize/.test(paystack) && /authorization_url|authorizationUrl/.test(paystack), 'hosted Paystack initialize/authorization URL missing');
assert(!/payment_status:\s*["']paid_verified/.test(paystack), 'Paystack checkout creation must not mark paid');
assert(/PAYSTACK_TEST_SECRET_KEY/.test(resolver) && /PAYSTACK_LIVE_SECRET_KEY/.test(resolver) && /DBX_ALLOW_LIVE_CHECKOUT/.test(resolver), 'Paystack mode key priority missing');
assert(/paystackConfigured/.test(controller) && /paystackMode/.test(controller) && /multiLineCheckoutSupported:\s*true/.test(controller), 'checkout readiness Paystack contract missing');
console.log('paystack hosted checkout lock smoke passed');
