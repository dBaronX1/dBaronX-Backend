import { readFileSync } from 'node:fs';
const roadmap = readFileSync('docs/cj-fulfillment-automation-roadmap.md','utf8');
const ok = ['draft_imported','pending_admin_approval','published_to_medusa'].every((s)=>roadmap.includes(s));
console.log(JSON.stringify({success:ok, blockers: ok?[]:['cj_onboarding_statuses_missing']}, null, 2));
process.exit(ok?0:1);
