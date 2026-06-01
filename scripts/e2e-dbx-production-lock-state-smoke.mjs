#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];
const read = (path) => readFileSync(join(root, path), "utf8");
const has = (path, needle) => read(path).includes(needle);
const noLiteral = (parts) => parts.join("");
const assert = (condition, code) => {
  if (!condition) failures.push(code);
};

const files = {
  manifest: "docs/dbx-production-lock-state.md",
  catalogController: "apps/api/src/modules/catalog/catalog.controller.ts",
  catalogService: "apps/api/src/modules/catalog/catalog.service.ts",
  catalogModule: "apps/api/src/modules/catalog/catalog.module.ts",
  platformModule: "apps/api/src/modules/platform/platform.module.ts",
  medusaHttp: "apps/api/src/shared/services/medusa-http.service.ts",
  authController: "apps/api/src/modules/auth/auth.controller.ts",
  authService: "apps/api/src/modules/auth/auth.service.ts",
  authMapper: "apps/api/src/modules/auth/auth-error.mapper.ts",
  checkoutController: "apps/api/src/modules/payments/checkout-session.controller.ts",
  checkoutDto: "apps/api/src/modules/payments/dto/create-stripe-checkout-session.dto.ts",
  checkoutSessionDto: "apps/api/src/modules/payments/dto/create-checkout-session.dto.ts",
  stripeCheckout: "apps/api/src/modules/payments/stripe-checkout.service.ts",
  paystackCheckout: "apps/api/src/modules/payments/paystack-checkout.service.ts",
  aiController: "apps/api/src/modules/ai-stories/ai-stories-generation.controller.ts",
  aiService: "apps/api/src/modules/ai-stories/ai-stories-generation.service.ts",
  fastapiRoute: "apps/services-fastapi/src/app/api/routes/ai_generation.py",
  fastapiProvider: "apps/services-fastapi/src/app/services/ai_provider_service.py",
  fastapiStoryService: "apps/services-fastapi/src/app/services/story_generation_service.py",
  telegramMain: "apps/telegram-bot/src/main.py",
  authDiagnosticSql: "supabase/sql/diagnostics/auth_user_creation_diagnostic.sql",
  authRepairSql: "supabase/sql/repairs/auth_user_creation_safe_repair.sql",
};

for (const [name, path] of Object.entries(files)) {
  assert(existsSync(join(root, path)), `${name}_missing`);
}

const manifest = existsSync(join(root, files.manifest)) ? read(files.manifest) : "";
for (const milestone of [
  "authReadinessRoute",
  "authRegisterRoute",
  "authLoginRoute",
  "ownerBootstrapGuarded",
  "catalogProductsRoute",
  "catalogProductDetailRoute",
  "medusaBridgeHealthy",
  "productCountAtLeastOne",
  "firstCjProductVisibleIfSeeded",
  "checkoutReadinessRoute",
  "stripeCheckoutSession",
  "paystackCheckoutSession",
  "multiLineCheckout",
  "noFakePaid",
  "aiStoriesFastApiReadiness",
  "aiStoriesNestGatewayReadiness",
  "telegramUnaffected",
]) {
  assert(manifest.includes(`\`${milestone}\``), `manifest_missing_${milestone}`);
}

const catalogController = read(files.catalogController);
const catalogService = read(files.catalogService);
const platformModule = read(files.platformModule);
const medusaHttp = read(files.medusaHttp);
assert(catalogController.includes('@Controller({ path: "catalog"'), "catalog_controller_not_mounted");
assert(catalogController.includes('@Get("readiness")'), "catalog_readiness_route_missing");
assert(catalogController.includes('@Get("products")'), "catalog_products_route_missing");
assert(catalogController.includes('@Get("products/:handle")'), "catalog_detail_route_missing");
assert(platformModule.includes("CatalogModule"), "catalog_module_not_imported");
assert(catalogService.includes('/store/products'), "catalog_not_calling_medusa_store_products");
assert(catalogService.includes('"x-caller-surface": callerSurface'), "catalog_missing_internal_medusa_caller_header");
assert(catalogService.includes("CATALOG_TEMPORARILY_UNAVAILABLE"), "catalog_safe_error_code_missing");
assert(catalogService.includes("Products are temporarily unavailable. Please try again."), "catalog_safe_message_missing");
assert(catalogService.includes("normalizeProducts") && catalogService.includes("skippedProductCount"), "catalog_normalization_or_skip_diagnostics_missing");
assert(catalogService.includes("missingVariantCount") && catalogService.includes("missingPriceCount") && catalogService.includes("missingImageCount"), "catalog_missing_bridge_diagnostics");
assert(catalogService.includes("getBaseUrlConfigured") && catalogService.includes("getPublishableKeyConfigured"), "catalog_readiness_missing_medusa_env_checks");
assert(!catalogService.includes("supplier_products"), "catalog_depends_on_supabase_supplier_products");
assert(!catalogService.includes(noLiteral(["Medusa bridge ", "request failed"])), "catalog_public_raw_medusa_bridge_wording_present");
assert(!medusaHttp.includes(noLiteral(["Medusa bridge ", "request failed"])), "medusa_http_raw_bridge_wording_present");

const authController = read(files.authController);
const authService = read(files.authService);
const authMapper = read(files.authMapper);
assert(authController.includes('@Post("register")'), "auth_register_route_missing");
assert(authController.includes('@Post("login")'), "auth_login_route_missing");
assert(authController.includes('@Get("readiness")'), "auth_readiness_route_missing");
assert(authController.includes('@Post("owner/bootstrap")'), "owner_bootstrap_route_missing");
assert(authService.includes("ownerBootstrapConfigured") && authService.includes("bootstrapOwner"), "owner_bootstrap_guard_not_preserved");
assert(authMapper.includes("AUTH_DATABASE_USER_CREATION_FAILED"), "auth_user_creation_error_mapper_missing");
assert(authService.includes("authUserCreationDiagnosticAvailable: true"), "auth_user_creation_diagnostic_readiness_missing");
assert(has(files.authDiagnosticSql, "handle_new_user") && has(files.authRepairSql, "handle_new_user"), "auth_user_creation_sql_lock_missing");
assert(!authController.includes(noLiteral(["auth_service", "_unavailable"])), "auth_controller_raw_legacy_error_present");

const checkoutController = read(files.checkoutController);
const checkoutDto = read(files.checkoutDto);
const checkoutSessionDto = read(files.checkoutSessionDto);
const stripeCheckout = read(files.stripeCheckout);
const paystackCheckout = read(files.paystackCheckout);
assert(checkoutController.includes('@Post("session")'), "checkout_session_route_missing");
assert(checkoutController.includes('@Get("readiness")'), "checkout_readiness_route_missing");
assert(checkoutController.includes("multiLineCheckoutSupported: true"), "checkout_multiline_readiness_missing");
assert(checkoutDto.includes("customer?: RocketCheckoutCustomerDto") && checkoutDto.includes("shippingAddress?: RocketCheckoutShippingAddressDto"), "rocket_checkout_customer_shipping_contract_missing");
assert(checkoutDto.includes("lineItems?: RocketCheckoutLineItemDto[]") && checkoutSessionDto.includes("paymentProvider") && checkoutDto.includes("source?: string"), "rocket_checkout_line_items_provider_source_contract_missing");
assert(stripeCheckout.includes("payload.lineItems.map") && stripeCheckout.includes("stripe.checkout.sessions.create"), "stripe_multiline_hosted_checkout_missing");
assert(paystackCheckout.includes("input.lineItems") && paystackCheckout.includes("transaction/initialize"), "paystack_checkout_initialize_missing");
assert(paystackCheckout.includes("PAYSTACK_WEBHOOK_SECRET") && paystackCheckout.includes("PAYSTACK_SECRET_KEY"), "paystack_webhook_secret_fallback_missing");
assert(!stripeCheckout.includes(noLiteral(["Multi-item checkout ", "is not supported yet"])), "stripe_one_item_blocker_present");
assert(!paystackCheckout.includes(noLiteral(["Multi-item checkout ", "is not supported yet"])), "paystack_one_item_blocker_present");

const aiController = read(files.aiController);
const aiService = read(files.aiService);
const fastapiRoute = read(files.fastapiRoute);
const fastapiProvider = read(files.fastapiProvider);
const fastapiStoryService = read(files.fastapiStoryService);
assert(aiController.includes('@Get("readiness")') && aiController.includes('@Post("generate")'), "nestjs_ai_gateway_routes_missing");
assert(aiService.includes('/ai/stories/readiness') && aiService.includes('/ai/stories/generate'), "nestjs_ai_not_calling_fastapi_story_routes");
assert(!/OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY|GOOGLE_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY/.test(aiService), "nestjs_ai_reads_provider_keys");
assert(fastapiRoute.includes('"/stories/readiness"') && fastapiRoute.includes('"/stories/generate"') && fastapiRoute.includes('prefix="/ai"'), "fastapi_ai_story_routes_missing");
for (const envName of ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"]) {
  assert(fastapiProvider.includes(envName), `fastapi_provider_env_missing_${envName}`);
}
assert(fastapiProvider.includes("AI_PROVIDER_ORDER") && fastapiProvider.includes("gemini,openai,anthropic"), "fastapi_provider_order_contract_missing");
assert(fastapiStoryService.includes("ai_provider_missing") && fastapiStoryService.includes("all_ai_providers_failed"), "fastapi_safe_ai_error_codes_missing");

const publicSources = [catalogController, catalogService, authController, checkoutController, aiController, aiService].join("\n");
for (const raw of [
  noLiteral(["Medusa bridge ", "request failed"]),
  noLiteral(["auth_service", "_unavailable"]),
  "supabase_error",
  "database_error",
  "internal_service_error",
  "service_role_missing",
  "jwt_error",
  "unexpected_error",
  "failed_to_fetch",
  "NetworkError",
]) {
  assert(!publicSources.includes(raw), `raw_public_wording_present_${raw.replace(/[^a-z0-9]+/gi, "_")}`);
}

const telegram = read(files.telegramMain);
const telegramRegistry = read("apps/telegram-bot/src/services/command_registry.py");
const telegramSettings = read("apps/telegram-bot/src/core/settings.py");
assert(telegramRegistry.includes("Role.ADMIN") && telegramRegistry.includes("protected_read") && telegramSettings.includes("TELEGRAM_ALLOWED_ADMIN_IDS"), "telegram_admin_guard_contract_missing");
assert(!/mark.*paid|fake.*fulfilled/i.test(`${telegram}\n${telegramRegistry}`), "telegram_payment_mutation_wording_present");

if (failures.length) {
  console.error("DBX production lock smoke failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("DBX production lock smoke passed.");
