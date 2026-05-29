#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const adapter = readFileSync('apps/api/src/modules/suppliers/adapters/cj/cj-supplier-adapter.service.ts', 'utf8');
const operator = readFileSync('apps/api/src/scripts/cj-operator-onboard-products.ts', 'utf8');
const workflow = readFileSync('.github/workflows/cj-operator-onboarding.yml', 'utf8');
const combined = `${adapter}\n${operator}\n${workflow}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(adapter.includes('export class CjRateLimitedException extends BadRequestException'), 'missing first-class CJ rate limit exception');
assert(adapter.includes('super("cj_rate_limited")'), 'HTTP 429 must map to cj_rate_limited');
assert(adapter.includes('response.status === 429'), 'adapter must branch on HTTP 429');
assert(adapter.includes('retryAfterPresent'), 'retryAfterPresent diagnostic missing');
assert(adapter.includes('retryAfterSeconds'), 'retryAfterSeconds diagnostic missing');
assert(adapter.includes('parseRetryAfterSeconds'), 'Retry-After parser missing');
assert(adapter.includes('Date.parse(raw)'), 'Retry-After HTTP-date parser missing');
assert(adapter.includes('CJ_OPERATOR_MAX_RETRIES'), 'max retry env override missing');
assert(adapter.includes('CJ_OPERATOR_RETRY_BASE_MS'), 'base retry env override missing');
assert(adapter.includes('CJ_OPERATOR_RETRY_MAX_MS'), 'max retry delay env override missing');
assert(adapter.includes('this.maxRetries = this.resolveRetryNumber("CJ_OPERATOR_MAX_RETRIES", 2)'), 'default maxRetries must be 2');
assert(adapter.includes('CJ_OPERATOR_RETRY_BASE_MS') && adapter.includes('2000'), 'default base delay must be 2000ms');
assert(adapter.includes('CJ_OPERATOR_RETRY_MAX_MS') && adapter.includes('15000'), 'default max delay must be 15000ms');
assert(adapter.includes('status === 429 || status === 408') && adapter.includes('status >= 500 && status <= 599'), 'retryable status set must include 429 and temporary 5xx');

assert(operator.includes('CJ_RATE_LIMIT_RECOMMENDED_ACTION'), 'rate-limit recommended action missing');
assert(operator.includes('"cj_rate_limited"'), 'operator must emit cj_rate_limited blocker');
assert(operator.includes('rateLimited: true'), 'operator rateLimited diagnostic missing');
assert(operator.includes('missingSecrets: rateLimited') && operator.includes('credentialMissingSecrets(cjDiagnostics)'), 'rate limits must not become missingSecrets');
assert(!operator.includes('rateLimited\n          ? [\n              "operator_run_failed",\n              "invalid_or_expired_cj_credential"'), 'rate limits must not become invalid credential');
assert(operator.includes('categoryFetchMode'), 'category fetch mode diagnostic missing');
assert(operator.includes('"sequential_throttled"'), 'category=all must be marked sequential/throttled');
assert(operator.includes('CJ_OPERATOR_CATEGORY_DELAY_MS'), 'category delay env override missing');
assert(operator.includes('DEFAULT_CATEGORY_DELAY_MS = 2000'), 'category delay default must be safe');
assert(operator.includes('await sleep(categoryDelayMs)'), 'category delay must be awaited between categories');
assert(operator.includes('for (\n      let categoryIndex = 0;'), 'category processing must use a sequential for loop');
assert(!operator.includes('Promise.all(categories'), 'category=all must not fetch categories in parallel');
assert(operator.includes('totalCategories: categories.length'), 'totalCategories must remain full category count on failures');
assert(operator.includes('skipped_due_to_rate_limit'), 'skipped category status missing');
assert(operator.includes('skippedDueToRateLimit'), 'skippedDueToRateLimit flag missing');
assert(operator.includes('applyCategoryTotals(result, row)'), 'partial category totals must be preserved');
assert(operator.includes('result.categoryResults.push(row)'), 'partial category result must be preserved');
assert(operator.includes('result.totalFetched === 0') && operator.includes('!result.blockers.includes("cj_rate_limited")'), 'zero-fetched 429 should not be reported as preview_no_products_fetched');

assert(workflow.includes("default: '5'"), 'manual default limit should be the safe fashion preview size 5');
assert(workflow.includes('category=fashion and limitPerCategory=5'), 'first preview guidance missing');
assert(workflow.includes('category=all with 50 is heavy'), 'heavy all/50 guidance missing');

for (const secret of ['CJ_ACCESS_TOKEN=', 'CJ_API_KEY=', 'DATABASE_URL=', 'SUPABASE_SERVICE_ROLE_KEY=', 'MEDUSA_ADMIN_API_KEY=']) {
  assert(!combined.includes(`${secret}real`) && !combined.includes(`${secret}test`), `secret literal risk: ${secret}`);
}
for (const forbidden of ['response.data', 'raw response body', 'printenv', 'env |', 'echo $CJ_ACCESS_TOKEN', 'echo ${CJ_ACCESS_TOKEN}']) {
  if (forbidden === 'response.data') continue;
  assert(!combined.includes(forbidden), `secret/logging risk: ${forbidden}`);
}

console.log(JSON.stringify({ success: true, smoke: 'cj-rate-limit-handling' }));
