#!/usr/bin/env node
import { read, assert } from './e2e-production-lock-helpers.mjs';
const cj = read('apps/api/src/modules/suppliers/cj-import/cj-product-import.service.ts');
const stripe = read('apps/api/src/modules/payments/stripe-checkout.service.ts');
const paystack = read('apps/api/src/modules/payments/paystack-checkout.service.ts');
assert(/readiness/.test(cj) && /preview/.test(cj) && /approve|publish/i.test(cj), 'CJ admin/manual workflow readiness-preview-approve-publish missing');
assert(!/cj.*import/i.test(stripe) && !/cj.*import/i.test(paystack), 'current payment sales must not depend on CJ import');
assert(/supplier:\s*"Verified Supplier"/.test(read('apps/api/src/modules/catalog/catalog.service.ts')), 'public catalog must not leak CJ label');
console.log('CJ onboarding does not block current sales smoke passed');
