import { read, exists, assert, all } from './e2e-production-lock-helpers.mjs';
for (const f of ['apps/web/src/app/checkout/success/page.tsx','apps/web/src/app/checkout/cancel/page.tsx','apps/web/src/app/checkout/unavailable/page.tsx','apps/web/src/app/(platform)/orders/page.tsx','apps/web/src/app/payment-status/page.tsx','apps/web/src/app/api/payment-status/route.ts']) assert(exists(f), `${f} missing`);
const pages = all('apps/web/src/app/checkout/success/page.tsx','apps/web/src/app/checkout/cancel/page.tsx','apps/web/src/app/payment-status/page.tsx');
assert(!/paid_verified\s*=|payment_status\s*:\s*["']paid_verified|setStatus\([^)]*paid/i.test(pages), 'frontend status pages must not mark paid');
const stripe = read('apps/api/src/modules/payments/stripe-checkout.service.ts');
assert(stripe.includes('handleWebhook') || stripe.includes('settleVerifiedCheckoutSession'), 'signed webhook/payment settlement path missing');
console.log('order/payment status lock smoke passed');
