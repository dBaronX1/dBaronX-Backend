import { spawnSync } from 'node:child_process';
import { exists, assert, read } from './e2e-production-lock-helpers.mjs';
const smokes = [
  'scripts/e2e-auth-profile-production-lock-smoke.mjs',
  'scripts/e2e-auth-login-no-register-conflict-smoke.mjs',
  'scripts/e2e-shop-products-production-lock-smoke.mjs',
  'scripts/e2e-cart-checkout-production-lock-smoke.mjs',
  'scripts/e2e-payment-mode-resolution-smoke.mjs',
  'scripts/e2e-paystack-payment-mode-build-contract-smoke.mjs',
  'scripts/e2e-order-payment-status-lock-smoke.mjs',
  'scripts/e2e-ai-stories-production-lock-smoke.mjs',
  'scripts/e2e-no-public-third-party-leaks-smoke.mjs',
  'scripts/e2e-no-secret-no-raw-error-lock-smoke.mjs',
  'scripts/e2e-stripe-current-success-lock-smoke.mjs',
  'scripts/e2e-paystack-hosted-checkout-lock-smoke.mjs',
  'scripts/e2e-order-history-after-webhook-lock-smoke.mjs',
  'scripts/e2e-cart-clear-after-verified-payment-lock-smoke.mjs',
  'scripts/e2e-owner-order-approval-lock-smoke.mjs',
  'scripts/e2e-catalog-no-foreign-labels-lock-smoke.mjs',
  'scripts/e2e-auth-login-register-separation-lock-smoke.mjs',
  'scripts/e2e-cj-onboarding-does-not-block-current-sales-smoke.mjs',
];
for (const file of smokes) {
  assert(exists(file), `${file} missing`);
  const result = spawnSync(process.execPath, [file], { stdio: 'inherit' });
  assert(result.status === 0, `${file} failed`);
}
const manifest = read('docs/dbx-production-lock-state.md');
for (const phrase of ['Auth readiness/register/login/logout/me/password reset','Catalog/shop/product detail','Cart selected checkout','Payment mode','AI Stories','Public wording']) assert(manifest.includes(phrase), `manifest missing ${phrase}`);
console.log('full DBX production lock smoke passed');
