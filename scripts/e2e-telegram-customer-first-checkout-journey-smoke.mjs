#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const paths = {
  registry: join(root, 'apps/telegram-bot/src/services/command_registry.py'),
  router: join(root, 'apps/telegram-bot/src/app/router.py'),
  customer: join(root, 'apps/telegram-bot/src/handlers/customer_handler.py'),
  control: join(root, 'apps/telegram-bot/src/handlers/control_surface_handler.py'),
  guard: join(root, 'apps/telegram-bot/src/shared/security/admin_guard.py'),
  docsControl: join(root, 'docs/telegram-bot-control-surface.md'),
  docsCheckout: join(root, 'docs/live-stripe-supplier-checkout.md'),
};
const source = Object.fromEntries(
  Object.entries(paths).map(([key, path]) => [key, existsSync(path) ? readFileSync(path, 'utf8') : '']),
);
const blockers = [];
const addBlocker = (name) => { if (!blockers.includes(name)) blockers.push(name); };

const customerCommands = ['shop', 'products', 'product', 'checkout_help', 'payment_status', 'order_status', 'support', 'contact_support'];
const publicCommandFailures = customerCommands.filter((command) => {
  const spec = new RegExp(`CommandSpec\\("${command}"[\\s\\S]*?Role\\.UNKNOWN`).test(source.registry);
  return !spec || !source.router.includes(`"${command}"`);
});
if (publicCommandFailures.length) addBlocker('customer_commands_not_registered_public');

const adminDiagnostics = ['status', 'payments_status', 'stripe_settlement', 'debug_status', 'env_check'];
const adminProtectionFailures = adminDiagnostics.filter((command) => {
  const protectedSpec = new RegExp(`CommandSpec\\("${command}"[\\s\\S]*?Role\\.(VIEWER|OPS|ADMIN|OWNER)`).test(source.registry);
  return !protectedSpec || (command !== 'debug_status' && !source.router.includes(`"${command}"`));
});
if (adminProtectionFailures.length) addBlocker('admin_diagnostics_not_protected');
if (!source.control.includes('require_role') || !source.guard.includes('SAFE_UNAUTHORIZED_MESSAGE')) addBlocker('admin_guard_missing');

const productSourceBacked = source.customer.includes('/store/products') && source.customer.includes('PRODUCT_SOURCE_RULE') && /Medusa Store API\/public API backed/.test(source.customer);
const demoFallbackMarked = source.customer.includes('DEMO') && source.customer.includes('real_supplier_product_missing');
if (!productSourceBacked && !demoFallbackMarked) addBlocker('product_source_not_api_backed_or_marked_fallback');

const productUrlReady = source.customer.includes('Product URL:') && source.customer.includes('/products/{quote') && source.customer.includes('Product listing URL:');
if (!productUrlReady) addBlocker('product_url_missing');

const productDiscoveryReady = source.customer.includes('_product_price') && source.customer.includes('_availability_hint') && source.customer.includes('_supplier_hint') && source.customer.includes('[:5]');
if (!productDiscoveryReady) addBlocker('product_discovery_details_missing');

const checkoutGuidanceReady = source.customer.includes('Telegram → product page → web checkout → Stripe-hosted checkout → signed webhook → order confirmation')
  && source.customer.includes('cannot complete or confirm payment')
  && source.customer.includes('signed Stripe webhook evidence');
if (!checkoutGuidanceReady) addBlocker('checkout_guidance_missing');

const paymentStatusSafe = source.customer.includes('/api/checkout/stripe/settlement-status')
  && source.customer.includes('pending_verification')
  && source.customer.includes('paid_verified')
  && source.customer.includes('not_found')
  && source.customer.includes('support_required')
  && source.customer.includes('Paid: false/not proven')
  && !/paymentMarkedPaid\s*=\s*True|paid\s*=\s*True/.test(source.customer);
if (!paymentStatusSafe) addBlocker('payment_status_can_fake_paid_or_missing_safe_states');

const orderStatusSafe = source.customer.includes('Safe status: {safe_status}')
  && source.customer.includes('Fulfilled: false/not proven')
  && source.customer.includes('never claims fulfillment')
  && !/Fulfilled: true \(backend proof\)|fulfilled\s*=\s*True/.test(source.customer);
if (!orderStatusSafe) addBlocker('order_status_can_fake_fulfilled_or_missing_safe_fallback');

const unsafeCustomerMutationPatterns = [
  /\.post\(/,
  /approve_payout|settle_payout|wallet_credit|credit_wallet|reward_credit|fulfill_order|supplier import mutation/i,
  /paymentMarkedPaid\s*=\s*True|fulfilled\s*=\s*True/i,
];
const unsafeMatches = unsafeCustomerMutationPatterns.filter((pattern) => pattern.test(source.customer));
if (unsafeMatches.length) addBlocker('unsafe_customer_write_detected');

const secretLeakPatterns = [
  new RegExp(['TELEGRAM_BOT_TOKEN', '.*[A-Za-z0-9]'].join('=')),
  new RegExp(['INTERNAL_SERVICE_TOKEN', '.*[A-Za-z0-9]'].join('=')),
  new RegExp(['STRIPE_SECRET_KEY', '.*[A-Za-z0-9]'].join('=')),
  new RegExp(['STRIPE_WEBHOOK_SECRET', '.*[A-Za-z0-9]'].join('=')),
  new RegExp(['SUPABASE_SERVICE_ROLE_KEY', '.*[A-Za-z0-9]'].join('=')),
  new RegExp(['CJ_ACCESS_TOKEN', '.*[A-Za-z0-9]'].join('=')),
  /\b[0-9]{6,12}:[A-Za-z0-9_-]{20,}\b/,
  /\bsk_(test|live)_[A-Za-z0-9]{12,}\b/,
  /\bwhsec_[A-Za-z0-9]{12,}\b/,
];
const allSource = Object.values(source).join('\n');
const secretLeakDetected = secretLeakPatterns.some((pattern) => pattern.test(allSource));
if (secretLeakDetected) addBlocker('secret_leak_detected');

const realSupplierProductPresent = productDiscoveryReady && source.customer.includes('_has_supplier_signal') && !demoFallbackMarked ? true : false;
const customerCommandsReady = publicCommandFailures.length === 0;
const adminCommandsProtected = adminProtectionFailures.length === 0 && source.control.includes('require_role') && source.guard.includes('SAFE_UNAUTHORIZED_MESSAGE');
const result = {
  success: blockers.length === 0,
  blockers,
  customerCommandsReady,
  productDiscoveryReady,
  realSupplierProductPresent,
  productUrlReady,
  checkoutGuidanceReady,
  paymentStatusSafe,
  orderStatusSafe,
  adminCommandsProtected,
  secretLeakDetected,
  productSourceBacked,
  demoFallbackMarked,
  unsafeActionsBlocked: unsafeMatches.length === 0,
  nextManualStep: realSupplierProductPresent
    ? 'Open /products in Telegram, choose a non-DEMO supplier product, then complete checkout only through the web storefront and Stripe-hosted checkout.'
    : 'Publish/import one approved real supplier product outside Telegram, confirm Medusa Store API lists it, then run this smoke and the live first-transaction smoke again.',
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);
