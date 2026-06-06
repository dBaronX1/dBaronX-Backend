#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const checks = [];

function file(path) {
  return readFileSync(join(root, path), 'utf8');
}
function exists(path) {
  return existsSync(join(root, path));
}
function check(name, condition, detail = '') {
  checks.push({ name, pass: Boolean(condition), detail });
  if (!condition) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
}
function warn(name, condition, detail = '') {
  if (!condition) warnings.push(`${name}${detail ? `: ${detail}` : ''}`);
}
function allFiles(start, predicate = () => true) {
  const base = join(root, start);
  if (!existsSync(base)) return [];
  const out = [];
  const stack = [base];
  while (stack.length) {
    const current = stack.pop();
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', 'dist', '.next', '.turbo', '.git', 'coverage', '__pycache__'].includes(entry.name)) continue;
        stack.push(full);
      } else if (entry.isFile()) {
        const rel = relative(root, full).replaceAll('\\', '/');
        if (predicate(rel)) out.push(rel);
      }
    }
  }
  return out;
}
function source(path) {
  return exists(path) ? file(path) : '';
}
function hasAll(text, patterns) {
  return patterns.every((pattern) => typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text));
}

const catalogController = source('apps/api/src/modules/catalog/catalog.controller.ts');
const catalogService = source('apps/api/src/modules/catalog/catalog.service.ts');
const catalogTypes = source('apps/api/src/modules/catalog/catalog.types.ts');
const checkoutController = source('apps/api/src/modules/payments/checkout-session.controller.ts');
const stripeController = source('apps/api/src/modules/payments/stripe-checkout.controller.ts');
const stripeService = source('apps/api/src/modules/payments/stripe-checkout.service.ts');
const paystackService = source('apps/api/src/modules/payments/paystack-checkout.service.ts');
const paymentModeResolver = source('apps/api/src/modules/payments/payment-mode-resolver.ts');
const authController = source('apps/api/src/modules/auth/auth.controller.ts');
const authMapper = source('apps/api/src/modules/auth/auth-error.mapper.ts');
const authService = source('apps/api/src/modules/auth/auth.service.ts');
const aiController = source('apps/api/src/modules/ai-stories/ai-stories-generation.controller.ts');
const aiService = source('apps/api/src/modules/ai-stories/ai-stories-generation.service.ts');
const fastApiFiles = allFiles('apps/services-fastapi/src/app', (rel) => rel.endsWith('.py'));
const fastApiText = fastApiFiles.map((rel) => `\n# ${rel}\n${file(rel)}`).join('\n');
const cjWorkflow = source('.github/workflows/cj-operator-onboarding.yml');
const cjScript = source('apps/api/src/scripts/cj-operator-onboard-products.ts');
const cjImportFiles = allFiles('apps/api/src/modules/suppliers/cj-import', (rel) => rel.endsWith('.ts'));
const cjImportText = cjImportFiles.map((rel) => `\n// ${rel}\n${file(rel)}`).join('\n');
const healthController = source('apps/api/src/health.controller.ts');

check('health route /health exists', /@Get\(["']health["']\)/.test(healthController));
check('health route /api/health exists', /@Get\(["']api\/health["']\)/.test(healthController));
check('auth readiness route exists', /@Get\(["']readiness["']\)/.test(authController));
check('checkout readiness route exists', /@Get\(["']readiness["']\)/.test(checkoutController));
check('catalog readiness route exists', /@Get\(["']readiness["']\)/.test(catalogController));
check('NestJS AI readiness route exists', /@Controller\(\{ path: ["']ai-stories["'], version: ["']1["'] \}\)/.test(aiController) && /@Get\(["']readiness["']\)/.test(aiController));

check('catalog products route exists', /@Get\(["']products["']\)/.test(catalogController));
check('catalog product detail route exists', /@Get\(["']products\/:handle["']\)/.test(catalogController));
check('catalog calls Medusa internally', catalogService.includes('MedusaHttpService') && /fetchMedusaProducts/.test(catalogService));
check('catalog normalizes public-safe fields', hasAll(catalogTypes + catalogService, ['productId', 'variantId', 'title', 'handle', 'imageUrl', 'images', 'priceMinor', 'currencyCode', 'buyable', 'category', 'deliveryEstimate', 'publicLabels', 'metadataPublic']));
check('catalog strips customer-unsafe metadata', catalogService.includes('SECRET_FIELD_PATTERN') && catalogService.includes('publicMetadata') && catalogService.includes('supplier: "Verified Supplier"'));
check('catalog visibility is not manualCurated-gated', !/if\s*\([^)]*manualCurated[^)]*\)\s*\{?\s*normalized\.push/.test(catalogService) && !/continue;[\s\S]{0,80}manualCurated/.test(catalogService));
check('catalog is not hardcoded to one shirt', !/return\s*\[\s*\{[\s\S]{0,800}mens-cotton-linen-long-sleeve-casual-shirt/.test(catalogService));

check('canonical checkout session route exists', /@Post\(["']session["']\)/.test(checkoutController));
check('Stripe checkout session route exists', /@Post\(["']stripe\/session["']\)/.test(checkoutController) || /@Controller\(\{ path: ["']checkout\/stripe/.test(stripeController) && /@Post\(["']session["']\)/.test(stripeController));
check('Paystack checkout session route exists', /@Post\(["']paystack\/session["']\)/.test(checkoutController));
check('Paystack verify route exists', /@Get\(["']paystack\/verify["']\)/.test(checkoutController));
check('Paystack webhook route exists', /@Post\(["']paystack\/webhook["']\)/.test(checkoutController));
check('Stripe webhook verifies signed proof', /@Post\(["']webhook["']\)/.test(stripeController) && /stripe-signature|Stripe-Signature/.test(stripeController) && /constructEvent|webhooks\.constructEvent|verify.*signature/i.test(stripeService + stripeController));
check('checkout creation does not mark paid_verified', !/createSession[\s\S]{0,14000}payment_status\s*[:=]\s*["']paid_verified["']/.test(stripeService + checkoutController + paystackService));
check('checkout supports multi-line selected payload', hasAll(source('apps/api/src/modules/payments/dto/create-checkout-session.dto.ts') + stripeService + paystackService + checkoutController, ['lineItems', 'items', 'multiLineCheckoutSupported']));
check('payment mode prefers test keys and gates live mode', paymentModeResolver.includes('DBX_PAYMENT_MODE') && paymentModeResolver.includes('DBX_ALLOW_LIVE_CHECKOUT') && /preferredTestKey[\s\S]{0,600}mode = ["']test["']/.test(paymentModeResolver));

check('auth route contract exists', hasAll(authController, ['@Post("register")', '@Post("login")', '@Post("logout")', '@Get("me")', '@Get("readiness")', '@Post("password-reset/request")']));
check('auth uses safe public error mapper', authController.includes('authErrorResponse') && authMapper.includes('AUTH_TEMPORARILY_UNAVAILABLE') && authMapper.includes('INVALID_CREDENTIALS'));
check('auth creates or updates safe profile row', /profile/i.test(authService) && /(upsert|create).*profile|profile.*(upsert|create)/is.test(authService));
check('auth does not expose raw provider errors in responses', authMapper.includes('AUTH_SAFE_MESSAGES[errorCode]') && authMapper.includes('publicAuthError') && !/message\s*:\s*extractProviderMessageForMappingOnly/.test(authMapper + authController));

check('FastAPI AI story readiness route exists', (fastApiText.includes('prefix="/ai"') && fastApiText.includes('"/stories/readiness"')) || (fastApiText.includes('prefix="/ai-stories"') && fastApiText.includes('"/readiness"')));
check('FastAPI AI story generate route exists', /prefix=["']\/ai["'][\s\S]{0,400}@router\.post\([\s\S]{0,80}["']\/stories\/generate["']/.test(fastApiText) || /prefix=["']\/ai-stories["'][\s\S]{0,400}@router\.post\([\s\S]{0,80}["']\/generate["']/.test(fastApiText));
check('NestJS AI gateway generation route exists', /@Post\(["']generate["']\)/.test(aiController) && /FastAPI|fastapi|ai.*stories/i.test(aiService));
check('AI provider env names supported', hasAll(fastApiText, ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY']));
check('AI provider default order is gemini/openai/anthropic', /gemini["']?,\s*["']?openai["']?,\s*["']?anthropic|gemini,openai,anthropic/.test(fastApiText));
check('AI generation is not faked with placeholder success', !/success\s*[:=]\s*True[\s\S]{0,500}(placeholder|mock|fake)/i.test(fastApiText));

check('CJ workflow dispatch exists', cjWorkflow.includes('workflow_dispatch:'));
for (const option of ['all', 'fashion', 'electronics', 'home-living', 'beauty', 'sports', 'automotive', 'agriculture', 'tech', 'finance']) {
  check(`CJ workflow category option ${option} exists`, new RegExp(`- ["']?${option}["']?`).test(cjWorkflow));
}
for (const mode of ['readiness', 'preview', 'import', 'approve-safe', 'publish-approved', 'full-safe']) {
  check(`CJ mode ${mode} exists`, cjWorkflow.includes(`- "${mode}"`) && (cjScript.includes(`mode === "${mode}"`) || cjScript.includes(`case "${mode}"`) || cjScript.includes(mode)));
}
check('CJ workflow safe default category and limit', /default:\s*["']all["']/.test(cjWorkflow) && /limitPerCategory[\s\S]{0,180}default:\s*["']5["']/.test(cjWorkflow));
check('CJ preview dryRun stays non-mutating by default', /dryRun[\s\S]{0,160}default:\s*["']true["']/.test(cjWorkflow) && /if \(!dryRun && \(mode === "import"/.test(cjScript));
check('CJ import writes staging before approval', /stageFetchedProducts|runImport/.test(cjScript + cjImportText) && /approveSafe|approve.*safe|approved/.test(cjScript + cjImportText));
check('CJ publish-approved path publishes catalog-visible products', /publish-approved/.test(cjScript) && /publishApproved|publish.*approved|published/.test(cjScript + cjImportText) && /checkout_enabled|medusa_product_id|storefront_products/.test(cjImportText));
check('CJ readiness reports blockers instead of faking readiness', /blockers/.test(cjScript + cjImportText) && !/success\s*:\s*true[\s\S]{0,250}cj_credentials_missing/i.test(cjImportText));

const publicErrorText = authMapper + source('apps/api/src/modules/payments/checkout-error.mapper.ts') + aiService + catalogService;
for (const unsafe of ['supabase_error', 'database_error', 'internal_service_error', 'service_role_missing', 'jwt_error', 'unexpected_error', 'failed_to_fetch', 'TypeError', 'NetworkError']) {
  check(`public error mapping does not expose ${unsafe}`, !new RegExp(`message\\s*:\\s*["'][^"']*${unsafe}`, 'i').test(publicErrorText));
}

const ownerFiles = [
  'apps/api/src/modules/payments/checkout-session.controller.ts',
  'apps/api/src/modules/payments/stripe-checkout.controller.ts',
  'apps/api/src/modules/payments/stripe-checkout.service.ts',
  'apps/api/src/modules/payments/paystack-checkout.service.ts',
  'apps/api/src/modules/catalog/catalog.service.ts',
  'apps/api/src/modules/auth/auth.controller.ts',
  'apps/api/src/modules/auth/auth-error.mapper.ts',
  'apps/api/src/modules/ai-stories/ai-stories-generation.service.ts',
  'apps/api/src/scripts/cj-operator-onboard-products.ts',
  '.github/workflows/cj-operator-onboarding.yml',
  ...cjImportFiles,
];
const ownerText = ownerFiles.filter(exists).map((rel) => `\n// ${rel}\n${file(rel)}`).join('\n');
check('no fake paid mutation path in locked owners', !/fake.*paid|mark.*paid.*true|payment_status\s*[:=]\s*["']paid["']/.test(ownerText));
check('no fake fulfilled mutation path in locked owners', !/fake.*fulfilled|fulfillment_status\s*[:=]\s*["']fulfilled["']/.test(ownerText));
check('no fake products or supplier readiness in locked owners', !/fake (product|supplier|stock|readiness)|supplier readiness.*success\s*:\s*true/i.test(ownerText));

const secretNames = ['DATABASE_URL', 'MEDUSA_DATABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET', 'COOKIE_SECRET', 'INTERNAL_SERVICE_TOKEN', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'PAYSTACK_SECRET_KEY', 'PAYSTACK_WEBHOOK_SECRET', 'CJ_ACCESS_TOKEN', 'CJ_API_KEY', 'TELEGRAM_BOT_TOKEN', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'];
const scannedFiles = allFiles('.', (rel) => /\.(ts|tsx|js|mjs|py|yml|yaml|env)$/.test(rel) && (rel.startsWith('apps/') || rel.startsWith('.github/workflows/')) && !rel.startsWith('apps/web/node_modules/') && !rel.includes('/node_modules/'));
const hardcodedSecrets = [];
for (const rel of scannedFiles) {
  const lines = file(rel).split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const name of secretNames) {
      if (!line.includes(name)) continue;
      if (/process\.env|os\.getenv|getenv\(|env\.|settings\.|secrets\.|vars\.|\$\{\{|String\(|Boolean\(|envPresent|config\.get/.test(line)) continue;
      const literalAssignment = new RegExp(`${name}\\s*[:=]\\s*['"]([^'"]{8,})['"]`, 'i').exec(line);
      if (!literalAssignment) continue;
      const value = literalAssignment[1];
      if (/redacted|placeholder|missing|example|dummy|test|your_|xxxx|development|localhost|postgres:postgres|change-me|\*\*\*/i.test(value)) continue;
      hardcodedSecrets.push(`${rel}:${index + 1}:${name}`);
    }
  });
}
check('no hardcoded secrets detected by lock smoke', hardcodedSecrets.length === 0, hardcodedSecrets.slice(0, 8).join(', '));

warn('FastAPI router files discovered', fastApiFiles.length > 0, 'no FastAPI source files discovered');

const passed = checks.filter((item) => item.pass).length;
const payload = {
  success: failures.length === 0,
  passed,
  failed: failures.length,
  warnings,
  failures,
};
console.log(JSON.stringify(payload, null, 2));
if (failures.length) process.exit(1);
