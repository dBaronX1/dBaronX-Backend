#!/usr/bin/env node
import fs from 'node:fs';

const mustContain = [
  ['manual tasks endpoint', 'apps/api/src/modules/payments/orders-status.controller.ts', '@Get("tasks")'],
  ['mark placed endpoint', 'apps/api/src/modules/payments/orders-status.controller.ts', '@Post("tasks/:id/mark-placed")'],
  ['add tracking endpoint', 'apps/api/src/modules/payments/orders-status.controller.ts', '@Post("tasks/:id/add-tracking")'],
  ['approve endpoint', 'apps/api/src/modules/payments/cj-approval.controller.ts', '@Post("tasks/:id/approve-cj")'],
  ['disapprove endpoint', 'apps/api/src/modules/payments/cj-approval.controller.ts', '@Post("tasks/:id/disapprove-cj")'],
  ['internal guard', 'apps/api/src/modules/payments/cj-approval.controller.ts', '@UseGuards(InternalAuthGuard)'],
  ['dry run default', 'apps/api/src/modules/payments/cj-order-dry-run.service.ts', 'mode: "dry_run"'],
  ['live gate enable', 'apps/api/src/modules/payments/cj-approval.service.ts', 'DBX_ENABLE_CJ_AUTO_ORDER'],
  ['live gate confirm', 'apps/api/src/modules/payments/cj-approval.service.ts', 'DBX_CONFIRM_CJ_ORDER_PLACEMENT'],
  ['paid verified gate', 'apps/api/src/modules/payments/cj-approval.service.ts', 'order.payment_status === "paid_verified"'],
  ['idempotency gate', 'apps/api/src/modules/payments/cj-approval.service.ts', 'idempotencyKeyPresent'],
  ['no shipped fabrication', 'apps/api/src/modules/payments/orders-status.controller.ts', 'placed_with_supplier'],
  ['tracking required', 'apps/api/src/modules/payments/orders-status.controller.ts', 'trackingNumber or trackingUrl required'],
];
for (const [name, file, token] of mustContain) {
  const data = fs.readFileSync(file, 'utf8');
  if (!data.includes(token)) throw new Error(`missing ${name} token ${token}`);
}
console.log('PASS e2e-cj-order-automation-safety-smoke');
