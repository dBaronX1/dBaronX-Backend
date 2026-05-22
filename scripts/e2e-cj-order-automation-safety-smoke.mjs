import { readFileSync } from 'node:fs';
const svc = readFileSync('apps/api/src/modules/payments/order-fulfillment.service.ts','utf8');
const checks = {
  paidVerifiedGate: svc.includes('payment_not_verified'),
  dryRunDefault: svc.includes('dryRunDefault: true'),
  duplicateBlocked: svc.includes('cj_order_already_exists'),
  noShippedMutation: !svc.includes('fulfilled') && !svc.includes('shipped'),
};
const success = Object.values(checks).every(Boolean);
console.log(JSON.stringify({success, checks, blockers: success?[]:['cj_order_automation_safety_contract_missing']}, null, 2));
process.exit(success?0:1);
