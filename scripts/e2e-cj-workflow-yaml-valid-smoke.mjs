#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const workflowPath = '.github/workflows/cj-operator-onboarding.yml';
const workflow = readFileSync(workflowPath, 'utf8');
const lines = workflow.split('\n');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function lineNumberOf(pattern) {
  const index = lines.findIndex((line) => pattern.test(line));
  return index >= 0 ? index + 1 : -1;
}

function sectionBetween(startNeedle, endNeedle) {
  const start = workflow.indexOf(startNeedle);
  assert(start >= 0, `missing section start: ${startNeedle}`);
  const end = endNeedle ? workflow.indexOf(endNeedle, start + startNeedle.length) : -1;
  return workflow.slice(start, end > start ? end : undefined);
}

function hasLine(pattern, message) {
  assert(lines.some((line) => pattern.test(line)), message);
}

function inputSection(inputName) {
  const dispatch = sectionBetween('workflow_dispatch:', 'jobs:');
  const inputPattern = new RegExp(`^\\s{6}${inputName}:\\s*$`, 'm');
  const start = dispatch.search(inputPattern);
  assert(start >= 0, `manual input missing: ${inputName}`);
  const after = dispatch.slice(start + dispatch.match(inputPattern)[0].length);
  const next = after.search(/^\s{6}[A-Za-z][A-Za-z0-9]*:\s*$/m);
  return dispatch.slice(start, next >= 0 ? start + dispatch.match(inputPattern)[0].length + next : undefined);
}

assert(!workflow.includes('\t'), 'workflow must not contain tab characters');
assert(lineNumberOf(/^name:\s*CJ Operator Onboarding\s*$/) === 1, 'workflow display name must be CJ Operator Onboarding on line 1');
hasLine(/^on:\s*$/, 'top-level on trigger block missing');
hasLine(/^\s{2}workflow_dispatch:\s*$/, 'workflow_dispatch manual trigger missing');
hasLine(/^\s{4}inputs:\s*$/, 'workflow_dispatch inputs block missing');
hasLine(/^jobs:\s*$/, 'jobs block missing');
hasLine(/^\s{2}run-cj-operator:\s*$/, 'run-cj-operator job missing');

const dispatch = sectionBetween('workflow_dispatch:', 'jobs:');
for (const input of ['mode', 'category', 'limitPerCategory', 'dryRun', 'readinessExitZero']) {
  const section = inputSection(input);
  assert(/^\s{8}description:\s*"[^"]+"\s*$/m.test(section), `${input} description must be quoted`);
  assert(/^\s{8}required:\s*true\s*$/m.test(section), `${input} must be required`);
  assert(/^\s{8}default:\s*"[^"]+"\s*$/m.test(section), `${input} default must be quoted`);
}

const mode = inputSection('mode');
for (const option of ['readiness', 'preview', 'import', 'approve-safe', 'publish-approved', 'full-safe']) {
  assert(mode.includes(`- "${option}"`), `mode option missing: ${option}`);
}

const category = inputSection('category');
assert(/^\s{8}default:\s*"fashion"\s*$/m.test(category), 'category default must be the safe fashion preview');
assert(category.includes('Use fashion with limit 5 first'), 'category safe first-preview guidance missing');
assert(category.includes('category=all with high limits is heavy'), 'category heavy-all guidance missing');

const limitPerCategory = inputSection('limitPerCategory');
assert(/^\s{8}default:\s*"(?:5|10)"\s*$/m.test(limitPerCategory), 'limitPerCategory default must be safe: 5 or 10');
assert(limitPerCategory.includes('Safe first value: 5'), 'limitPerCategory safe value guidance missing');
assert(limitPerCategory.includes('Heavy: 50 with category=all'), 'limitPerCategory heavy-all/50 guidance missing');

for (const booleanChoice of ['dryRun', 'readinessExitZero']) {
  const section = inputSection(booleanChoice);
  assert(/^\s{8}type:\s*choice\s*$/m.test(section), `${booleanChoice} must be a string-safe choice input`);
  assert(section.includes('- "true"') && section.includes('- "false"'), `${booleanChoice} must offer quoted true/false choices`);
}

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('- ') || trimmed.includes('|')) continue;
  const match = line.match(/^\s+[A-Za-z][A-Za-z0-9_-]*:\s+(.+)$/);
  if (!match) continue;
  const value = match[1].trim();
  if (value.startsWith('"') || value.startsWith("'") || value.startsWith('${{') || ['true', 'false'].includes(value) || /^\d+$/.test(value) || value.startsWith('{')) continue;
  assert(!value.includes(': '), `plain scalar with colon-space must be quoted: ${trimmed}`);
}

const operatorStep = sectionBetween('name: Run CJ operator and capture JSON output', '- name: Validate operator output contract');
for (const mapping of [
  'CJ_ACCESS_TOKEN: ${{ secrets.CJ_ACCESS_TOKEN }}',
  'CJ_API_KEY: ${{ secrets.CJ_API_KEY }}',
  'DATABASE_URL: ${{ secrets.DATABASE_URL }}',
  'SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',
  'SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}',
]) {
  assert(operatorStep.includes(mapping), `operator env mapping missing: ${mapping}`);
}
assert(operatorStep.includes('recommendedFirstPreview=category=fashion limitPerCategory=5'), 'operator safe first-preview guidance missing');
assert(operatorStep.includes('heavyPreviewWarning=category=all limitPerCategory=50'), 'operator heavy all/50 guidance missing');

for (const forbidden of [
  'echo $CJ_ACCESS_TOKEN',
  'echo ${CJ_ACCESS_TOKEN}',
  'echo "$CJ_ACCESS_TOKEN"',
  'echo "${CJ_ACCESS_TOKEN}"',
  'echo $CJ_API_KEY',
  'echo ${CJ_API_KEY}',
  'echo $DATABASE_URL',
  'echo ${DATABASE_URL}',
  'printenv',
  'env |',
]) {
  assert(!workflow.includes(forbidden), `secret print risk: ${forbidden}`);
}

for (const secretName of ['CJ_ACCESS_TOKEN', 'CJ_API_KEY', 'DATABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'MEDUSA_ADMIN_API_KEY']) {
  const literalAssignment = new RegExp(`${secretName}=([A-Za-z0-9_./:+-]{6,}|['"][^$][^'"]{5,}['"])`);
  assert(!literalAssignment.test(workflow), `literal secret assignment risk: ${secretName}`);
}

console.log(JSON.stringify({
  success: true,
  smoke: 'cj-workflow-yaml-valid',
  workflow: workflowPath,
  name: 'CJ Operator Onboarding',
  categoryDefault: 'fashion',
  limitPerCategoryDefault: '5',
}));
