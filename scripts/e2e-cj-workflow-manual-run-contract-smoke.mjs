#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const workflowPath = '.github/workflows/cj-operator-onboarding.yml';
const workflow = readFileSync(workflowPath, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function lineMatches(pattern) {
  return workflow.split('\n').some((line) => pattern.test(line));
}

function sectionBetween(startNeedle, endNeedle) {
  const start = workflow.indexOf(startNeedle);
  assert(start >= 0, `missing section start: ${startNeedle}`);
  const end = endNeedle ? workflow.indexOf(endNeedle, start + startNeedle.length) : -1;
  return workflow.slice(start, end > start ? end : undefined);
}

assert(lineMatches(/^name:\s*CJ Operator Onboarding\s*$/), 'workflow display name must be CJ Operator Onboarding');
assert(lineMatches(/^\s*workflow_dispatch:\s*$/), 'workflow_dispatch manual trigger missing');

const dispatch = sectionBetween('workflow_dispatch:', 'jobs:');
for (const input of ['mode', 'category', 'limitPerCategory', 'dryRun', 'readinessExitZero']) {
  assert(new RegExp(`^\\s{6}${input}:\\s*$`, 'm').test(dispatch), `manual input missing: ${input}`);
  const inputStart = dispatch.search(new RegExp(`^\\s{6}${input}:\\s*$`, 'm'));
  const afterInput = dispatch.slice(inputStart);
  const nextInput = afterInput.slice(1).search(/^\s{6}[A-Za-z][A-Za-z0-9]*:\s*$/m);
  const inputBlock = nextInput >= 0 ? afterInput.slice(0, nextInput + 1) : afterInput;
  assert(/^\s{8}required:\s*true\s*$/m.test(inputBlock), `manual input must be required: ${input}`);
}
assert(/default:\s*[\"']?(?:5|10)[\"']?/.test(sectionBetween('limitPerCategory:', 'dryRun:')), 'limitPerCategory default must be first-preview safe');
assert(dispatch.includes('Use fashion with limit 5 first') || (dispatch.includes('category=fashion') && dispatch.includes('limitPerCategory=5')), 'first preview fashion/5 guidance missing');
assert(dispatch.includes('category=all with high limits is heavy') || dispatch.includes('Heavy: 50 with category=all') || dispatch.includes('category=all with 50 is heavy'), 'heavy all/50 guidance missing');

const operatorStep = sectionBetween('name: Run CJ operator and capture JSON output', '- name: Validate operator output contract');
assert(operatorStep.includes('CJ_ACCESS_TOKEN: ${{ secrets.CJ_ACCESS_TOKEN }}'), 'CJ_ACCESS_TOKEN is not mapped into operator step');
assert(operatorStep.includes('CJ_API_KEY: ${{ secrets.CJ_API_KEY }}'), 'CJ_API_KEY is not mapped into operator step');
assert(operatorStep.includes('recommendedFirstPreview=category=fashion limitPerCategory=5'), 'operator log guidance for safe first preview missing');
assert(operatorStep.includes('heavyPreviewWarning=category=all limitPerCategory=50'), 'operator log guidance for heavy all/50 preview missing');

for (const forbidden of [
  'echo $CJ_ACCESS_TOKEN',
  'echo ${CJ_ACCESS_TOKEN}',
  'echo "$CJ_ACCESS_TOKEN"',
  'echo "${CJ_ACCESS_TOKEN}"',
  'echo $CJ_API_KEY',
  'echo ${CJ_API_KEY}',
  'echo "$CJ_API_KEY"',
  'echo "${CJ_API_KEY}"',
  'echo $DATABASE_URL',
  'echo ${DATABASE_URL}',
  'printenv',
  'env |',
]) {
  assert(!workflow.includes(forbidden), `secret print risk: ${forbidden}`);
}

for (const secretName of ['CJ_ACCESS_TOKEN', 'CJ_API_KEY', 'DATABASE_URL', 'STRIPE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  const literalAssignment = new RegExp(`${secretName}=([A-Za-z0-9_./:+-]{6,}|['\"][^$][^'\"]{5,}['\"])`);
  assert(!literalAssignment.test(workflow), `literal secret assignment risk: ${secretName}`);
}

console.log(JSON.stringify({ success: true, smoke: 'cj-workflow-manual-run-contract', workflow: workflowPath }));
