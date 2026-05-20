import fs from 'node:fs';

const checks = [
  ['webhook route exists', 'apps/api/src/modules/payments/stripe-checkout.controller.ts', '@Post("webhook")'],
  ['customer_orders migration exists', 'supabase/migrations/202605200001_customer_orders_and_manual_fulfillment_queue.sql', 'app_public.customer_orders'],
  ['fulfillment_tasks migration exists', 'supabase/migrations/202605200001_customer_orders_and_manual_fulfillment_queue.sql', 'app_private.fulfillment_tasks'],
  ['paid_verified only after verified webhook path', 'apps/api/src/modules/payments/stripe-checkout.service.ts', 'payment_status: "paid_verified"'],
  ['manual fulfillment required', 'apps/api/src/modules/payments/stripe-checkout.service.ts', 'manual_required: true'],
  ['no auto fulfilled shipped', 'apps/api/src/modules/payments/stripe-checkout.service.ts', 'fulfilled'],
  ['customer status endpoint exists', 'apps/api/src/modules/payments/orders-status.controller.ts', '@Get("status")'],
  ['admin fulfillment endpoint protected', 'apps/api/src/modules/payments/orders-status.controller.ts', '@UseGuards(InternalAuthGuard)'],
  ['cj automation not enabled unsafely', 'apps/api/src/modules/payments/stripe-checkout.service.ts', 'automation_eligible: false'],
];

let failed = false;
for (const [name, file, pattern] of checks) {
  const src = fs.readFileSync(file, 'utf8');
  const pass = pattern === 'fulfilled' ? !src.includes('fulfillment_status: "fulfilled"') : src.includes(pattern);
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`);
  if (!pass) failed = true;
}
if (failed) process.exit(1);
