import { read, assert } from './e2e-production-lock-helpers.mjs';
const resolver = read('apps/api/src/modules/payments/payment-mode-resolver.ts');
const readiness = read('apps/api/src/modules/payments/checkout-session.controller.ts');
for (const text of ['STRIPE_TEST_SECRET_KEY','STRIPE_LIVE_SECRET_KEY','PAYSTACK_TEST_SECRET_KEY','PAYSTACK_LIVE_SECRET_KEY','DBX_PAYMENT_MODE','DBX_ALLOW_LIVE_CHECKOUT','sk_test_','sk_live_']) assert(resolver.includes(text), `payment resolver missing ${text}`);
assert(resolver.indexOf('if (testKey)') < resolver.indexOf('} else if (liveKey)'), 'test keys must win before live keys');
assert(resolver.includes('live_checkout_requires_explicit_allowance_with_test_key_present'), 'live override with test key guard missing');
assert(readiness.includes('stripeMode') && readiness.includes('paystackMode') && readiness.includes('multiLineCheckoutSupported'), 'checkout readiness safe mode fields missing');
assert(!/secretKey\s*[,}]/.test(readiness), 'readiness must not return key values');
console.log('payment mode resolution smoke passed');
