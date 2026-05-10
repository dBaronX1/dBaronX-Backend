#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const paths = {
  registry: join(root, 'apps/telegram-bot/src/services/command_registry.py'),
  router: join(root, 'apps/telegram-bot/src/app/router.py'),
  customer: join(root, 'apps/telegram-bot/src/handlers/customer_handler.py'),
  control: join(root, 'apps/telegram-bot/src/handlers/control_surface_handler.py'),
  guard: join(root, 'apps/telegram-bot/src/shared/security/admin_guard.py'),
};
const source = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, existsSync(path) ? readFileSync(path, 'utf8') : '']));
const blockers = [];

const publicCommands = ['start', 'help', 'shop', 'products', 'product', 'cart_help', 'checkout_help', 'order_status', 'payment_status', 'support', 'contact_support'];
const protectedCommands = ['status', 'payments_status', 'stripe_storage', 'stripe_first_tx_status', 'stripe_settlement', 'medusa_status', 'commerce_status', 'suppliers_status', 'dbx_status', 'watch_status', 'affiliate_status', 'ai_stories_status'];

if (!source.registry) blockers.push('command_registry_missing');
if (!source.router) blockers.push('router_missing');
if (!source.customer) blockers.push('customer_handler_missing');

const missingPublic = publicCommands.filter((command) => !source.registry.includes(`"${command}"`) || !source.router.includes(`"${command}"`));
if (missingPublic.length) blockers.push('public_customer_commands_missing');

const publicRoleFailures = publicCommands.filter((command) => !source.registry.includes(`CommandSpec("${command}"`) || !source.registry.match(new RegExp(`CommandSpec\\("${command}"[\\s\\S]*?Role\\.UNKNOWN`)));
if (publicRoleFailures.length) blockers.push('public_customer_commands_not_role_unknown');

const missingProtected = protectedCommands.filter((command) => !source.registry.includes(`"${command}"`) || !source.router.includes(`"${command}"`));
if (missingProtected.length) blockers.push('protected_admin_commands_missing');

const protectedRoleFailures = protectedCommands.filter((command) => !source.registry.match(new RegExp(`CommandSpec\\("${command}"[\\s\\S]*?Role\\.(VIEWER|OPS|ADMIN|OWNER)`)));
if (protectedRoleFailures.length) blockers.push('protected_admin_commands_not_protected');

if (!source.router.includes('public_customer_commands') || !source.router.includes('customer_command_handler')) blockers.push('public_customer_router_split_missing');
if (!source.router.includes('control_commands') || !source.control.includes('require_role')) blockers.push('admin_control_guard_missing');
if (!source.guard.includes('SAFE_UNAUTHORIZED_MESSAGE') || !source.guard.includes('require_role')) blockers.push('unauthorized_admin_block_missing');

const unsafeCustomerMutationPatterns = [
  /approve_payout|settle_payout|wallet_credit|credit_wallet|reward_credit|fulfill_order|import-readiness|payout_approve|payout_settle/i,
  /\.post\(/,
  /paymentMarkedPaid\s*=\s*True|fulfilled\s*=\s*True/i,
];
const customerUnsafeMatches = unsafeCustomerMutationPatterns.filter((pattern) => pattern.test(source.customer));
if (customerUnsafeMatches.length) blockers.push('customer_command_unsafe_write_detected');

const proofRules = {
  noFakePaid: source.customer.includes('never treated as paid unless backend proof explicitly says paid') && source.customer.includes('Paid: false/not proven'),
  noFakeFulfilled: source.customer.includes('never treated as fulfilled unless backend proof explicitly says fulfilled') && source.customer.includes('Fulfilled: false/not proven'),
  customerNoAdminReadiness: !/startup_blockers|adminGuardConfigured|internalTokenPresent/.test(source.customer),
  supportFallback: source.customer.includes('/support') && source.customer.includes('endpoint_not_available_yet'),
  productsFallback: source.customer.includes('/store/products') && source.customer.includes('endpoint_not_available_yet'),
};
const missingProofRules = Object.entries(proofRules).filter(([, ok]) => !ok).map(([name]) => name);
if (missingProofRules.length) blockers.push('customer_proof_guards_missing');

const secretLeakPatterns = [
  /TELEGRAM_BOT_TOKEN=.*[A-Za-z0-9]/,
  /INTERNAL_SERVICE_TOKEN=.*[A-Za-z0-9]/,
  /STRIPE_SECRET_KEY=.*[A-Za-z0-9]/,
  /STRIPE_WEBHOOK_SECRET=.*[A-Za-z0-9]/,
  /SUPABASE_SERVICE_ROLE_KEY=.*[A-Za-z0-9]/,
  /\b[0-9]{6,12}:[A-Za-z0-9_-]{20,}\b/,
  /\bsk_(test|live)_[A-Za-z0-9]{12,}\b/,
  /\bwhsec_[A-Za-z0-9]{12,}\b/,
];
const allSource = Object.values(source).join('\n');
const secretLeakDetected = secretLeakPatterns.some((pattern) => pattern.test(allSource));
if (secretLeakDetected) blockers.push('secret_leak_detected');

const commandCount = (source.registry.match(/CommandSpec\(/g) || []).length;
const publicCommandCount = publicCommands.length;
const protectedCommandCount = protectedCommands.length;

const result = {
  success: blockers.length === 0,
  blockers,
  commandCount,
  publicCommandCount,
  protectedCommandCount,
  publicCommandsRegistered: missingPublic.length === 0,
  adminCommandsProtected: missingProtected.length === 0 && protectedRoleFailures.length === 0,
  unsafeActionsBlocked: customerUnsafeMatches.length === 0,
  noUnprovedPaidSettledFulfilledClaims: missingProofRules.length === 0,
  secretLeakDetected,
  missingPublic,
  missingProtected,
  publicRoleFailures,
  protectedRoleFailures,
  missingProofRules,
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);
