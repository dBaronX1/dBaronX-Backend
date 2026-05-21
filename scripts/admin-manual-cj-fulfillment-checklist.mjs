#!/usr/bin/env node
import process from 'node:process';

const API_BASE_URL = String(process.env.API_BASE_URL || '').trim();
const INTERNAL_SERVICE_TOKEN = String(process.env.INTERNAL_SERVICE_TOKEN || '').trim();
const CHECKOUT_REF = String(process.env.CHECKOUT_REF || '').trim();
const ORDER_ID = String(process.env.ORDER_ID || '').trim();
const DBX_CONFIRM_ADMIN_ACTION = String(process.env.DBX_CONFIRM_ADMIN_ACTION || '').trim().toLowerCase() === 'true';

if (!API_BASE_URL) {
  console.error('ERROR: API_BASE_URL is required');
  process.exit(1);
}
if (!INTERNAL_SERVICE_TOKEN) {
  console.error('ERROR: INTERNAL_SERVICE_TOKEN is required');
  process.exit(1);
}

const headers = {
  'content-type': 'application/json',
  'x-internal-token': INTERNAL_SERVICE_TOKEN,
};

function buildBase(path) {
  return `${API_BASE_URL.replace(/\/$/, '')}${path}`;
}

function matchesFilter(task) {
  if (!CHECKOUT_REF && !ORDER_ID) return true;
  const orderIdCandidates = [task.order_id, task.order?.id].filter(Boolean);
  if (ORDER_ID && orderIdCandidates.includes(ORDER_ID)) return true;
  const checkoutRefCandidates = [task.checkout_ref, task.order_checkout_ref, task.order?.checkout_ref].filter(Boolean);
  if (CHECKOUT_REF && checkoutRefCandidates.includes(CHECKOUT_REF)) return true;
  return false;
}

async function getTasks() {
  const res = await fetch(buildBase('/api/admin/fulfillment/tasks'), { headers });
  if (!res.ok) {
    throw new Error(`Failed to list tasks: ${res.status} ${res.statusText}`);
  }
  const body = await res.json();
  return Array.isArray(body?.tasks) ? body.tasks : [];
}

function printTask(task) {
  console.log(`- task_id=${task.id} order_id=${task.order_id || 'n/a'} checkout_ref=${task.checkout_ref || 'n/a'} task_status=${task.task_status || task.status || 'n/a'} manual_required=${task.manual_required} automation_eligible=${task.automation_eligible}`);
  console.log(`  payment_status=${task.payment_status || 'n/a'} order_status=${task.order_status || 'n/a'} fulfillment_status=${task.fulfillment_status || 'n/a'}`);
  console.log(`  product='${task.product_title || 'n/a'}' supplier=${task.supplier || 'n/a'} supplier_product_id=${task.supplier_product_id || 'n/a'} sku=${task.supplier_sku || 'n/a'}`);
}

function checklist(task) {
  console.log('\nSAFE MANUAL CHECKLIST (DO NOT SKIP):');
  console.log('1) Payment proof verified: confirm payment_status=paid_verified and order_status=pending_fulfillment before supplier placement.');
  console.log('2) Fraud/address check: verify email, shipping name, shipping address, and risk signals before ordering.');
  console.log('3) Product/SKU check: confirm supplier_product_id + supplier_sku exactly match purchased product.');
  console.log('4) Shipping/cost check: verify shipping method, destination feasibility, taxes/duties, and margin/cost approval.');
  console.log('5) CJ manual placement: place order in CJ dashboard manually using validated shipping + SKU details.');
  console.log('6) Record placement only after CJ accepts order.');
  console.log('7) Add tracking only when CJ provides real tracking number and/or URL.');

  console.log('\nCOMMAND TEMPLATES:');
  console.log(`mark-placed:\ncurl -sS -X POST '${buildBase(`/api/admin/fulfillment/tasks/${task.id}/mark-placed`)}' \\\n  -H 'x-internal-token: <REDACTED>' \\\n  -H 'content-type: application/json'`);
  console.log(`add-tracking:\ncurl -sS -X POST '${buildBase(`/api/admin/fulfillment/tasks/${task.id}/add-tracking`)}' \\\n  -H 'x-internal-token: <REDACTED>' \\\n  -H 'content-type: application/json' \\\n  --data '{"trackingNumber":"<REAL_TRACKING_NUMBER>","trackingUrl":"<REAL_TRACKING_URL_OPTIONAL>"}'`);
}

async function main() {
  console.log(`Mode: ${DBX_CONFIRM_ADMIN_ACTION ? 'CONFIRMATION ENABLED' : 'DRY RUN CHECKLIST ONLY'}`);
  const tasks = await getTasks();
  const filtered = tasks.filter(matchesFilter);
  console.log(`Found ${tasks.length} total task(s); ${filtered.length} matching filter(s).`);
  if (!filtered.length) {
    console.log('No matching tasks found.');
    return;
  }

  for (const task of filtered) {
    printTask(task);
    checklist(task);
  }

  if (!DBX_CONFIRM_ADMIN_ACTION) {
    console.log('\nNo state changes executed. Set DBX_CONFIRM_ADMIN_ACTION=true to allow explicit admin action execution in future script extensions.');
  } else {
    console.log('\nDBX_CONFIRM_ADMIN_ACTION=true detected, but this script still performs no automatic mutations by design. Use explicit command templates only.');
  }
}

main().catch((error) => {
  console.error('ERROR:', error.message);
  process.exit(1);
});
