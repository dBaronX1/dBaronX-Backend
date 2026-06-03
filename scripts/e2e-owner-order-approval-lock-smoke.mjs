#!/usr/bin/env node
import { read, assert } from './e2e-production-lock-helpers.mjs';
const controller = read('apps/api/src/modules/payments/orders-status.controller.ts');
const service = read('apps/api/src/modules/payments/order-fulfillment.service.ts');
const docs = read('docs/order-approval-runbook.md');
assert(/@UseGuards\(InternalAuthGuard\)/.test(controller), 'admin fulfillment routes must require internal auth guard');
assert(/@Get\("tasks"\)/.test(controller) && /mark-placed/.test(controller) && /add-tracking/.test(controller), 'owner approval routes missing');
assert(/payment_status[^\n]+paid_verified/.test(controller), 'mark placed/tracking must require paid_verified');
assert(/trackingNumber \|\| trackingUrl|required/.test(controller), 'tracking proof requirement missing');
assert(!/status:\s*"delivered"|status:\s*"shipped"/.test(controller), 'admin actions must not mark shipped/delivered');
assert(/adminReadiness/.test(service) && /@Get\("readiness"\)/.test(controller), 'admin fulfillment readiness missing');
assert(/Invoke-RestMethod/.test(docs) && /mark-placed/.test(docs) && /add-tracking/.test(docs), 'PowerShell runbook examples missing');
console.log('owner order approval lock smoke passed');
