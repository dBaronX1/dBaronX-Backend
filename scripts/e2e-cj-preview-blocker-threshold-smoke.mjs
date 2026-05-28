import { readFileSync } from 'node:fs';

const source = readFileSync('apps/api/src/scripts/cj-operator-onboard-products.ts', 'utf8');
if (!source.includes("if (mode === 'preview' && result.totalFetched === 0) result.blockers.push('preview_no_products_fetched');")) {
  throw new Error('missing aggregate preview_no_products_fetched blocker guard');
}
if (source.includes("if (mode === 'preview' && row.fetched === 0) row.blockers.push('preview_no_products_fetched');")) {
  throw new Error('found per-category preview_no_products_fetched blocker');
}
console.log('ok');
