import { readFileSync } from 'node:fs';
const ctrl = readFileSync('apps/api/src/modules/payments/orders-status.controller.ts','utf8');
const guard = ctrl.includes('@UseGuards(InternalAuthGuard)');
const approve = ctrl.includes('approve-cj');
const disapprove = ctrl.includes('disapprove-cj');
const success = guard && approve && disapprove;
console.log(JSON.stringify({success, guard, approve, disapprove, blockers: success?[]:['telegram_admin_cj_approval_contract_missing']}, null, 2));
process.exit(success?0:1);
