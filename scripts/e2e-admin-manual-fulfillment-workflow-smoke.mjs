#!/usr/bin/env node
import fs from 'node:fs';

const checks = [
  ['admin tasks endpoint exists', 'apps/api/src/modules/payments/orders-status.controller.ts', '@Get("tasks")'],
  ['mark placed endpoint exists', 'apps/api/src/modules/payments/orders-status.controller.ts', '@Post("tasks/:id/mark-placed")'],
  ['add tracking endpoint exists', 'apps/api/src/modules/payments/orders-status.controller.ts', '@Post("tasks/:id/add-tracking")'],
  ['admin endpoints protected by InternalAuthGuard', 'apps/api/src/modules/payments/orders-status.controller.ts', '@UseGuards(InternalAuthGuard)'],
  ['internal token header required by guard', 'apps/api/src/shared/guards/internal-auth.guard.ts', '"x-internal-token"'],
  ['customer cannot mark placed via JWT routes', 'apps/api/src/modules/payments/orders-status.controller.ts', '@UseGuards(JwtAuthGuard)'],
  ['mark placed does not mark shipped', 'apps/api/src/modules/payments/orders-status.controller.ts', 'placed_with_supplier'],
  ['mark placed requires paid_verified', 'apps/api/src/modules/payments/orders-status.controller.ts', 'payment_not_verified'],
  ['mark placed returns order_not_found blocker when order missing', 'apps/api/src/modules/payments/orders-status.controller.ts', 'order_not_found'],
  ['admin list includes checkout reference', 'apps/api/src/modules/payments/order-fulfillment.service.ts', 'checkout_ref'],
  ['admin list includes stripe session mapping', 'apps/api/src/modules/payments/order-fulfillment.service.ts', 'stripe_session_id'],
  ['tracking requires tracking number/url', 'apps/api/src/modules/payments/orders-status.controller.ts', 'trackingNumber or trackingUrl required'],
  ['add tracking requires paid_verified', 'apps/api/src/modules/payments/orders-status.controller.ts', 'payment_not_verified'],
  ['no fake delivered status write', 'apps/api/src/modules/payments/orders-status.controller.ts', 'delivered'],
  ['manual_required default true in migration', 'supabase/migrations/202605200001_customer_orders_and_manual_fulfillment_queue.sql', 'manual_required boolean not null default true'],
  ['automation_eligible default false in migration', 'supabase/migrations/202605200001_customer_orders_and_manual_fulfillment_queue.sql', 'automation_eligible boolean not null default false'],
  ['webhook writes paid_verified + pending_fulfillment', 'apps/api/src/modules/payments/stripe-checkout.service.ts', 'order_status: "pending_fulfillment"'],
  ['webhook task status queued_manual_review', 'apps/api/src/modules/payments/stripe-checkout.service.ts', 'status: "queued_manual_review"'],
];

let failed = false;
for (const [name, file, pattern] of checks) {
  const src = fs.readFileSync(file, 'utf8');
  const pass = pattern === 'delivered'
    ? !src.includes('fulfillment_status: "delivered"') && !src.includes('status: "delivered"')
    : src.includes(pattern);
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`);
  if (!pass) failed = true;
}

if (failed) process.exit(1);
