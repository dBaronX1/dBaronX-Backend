import { readFileSync } from 'node:fs';

const source = readFileSync('apps/api/src/scripts/cj-operator-onboard-products.ts', 'utf8');
if (!source.includes('result.totalFetched === 0') || !source.includes("result.blockers.push(\"preview_no_products_fetched\")")) {
  throw new Error('missing aggregate preview_no_products_fetched blocker guard');
}
if (!source.includes('!result.blockers.includes("cj_rate_limited")')) {
  throw new Error('rate-limited preview must not be downgraded to preview_no_products_fetched');
}
if (source.includes("if (mode === 'preview' && row.fetched === 0) row.blockers.push('preview_no_products_fetched');")) {
  throw new Error('found per-category preview_no_products_fetched blocker');
}
console.log('ok');
