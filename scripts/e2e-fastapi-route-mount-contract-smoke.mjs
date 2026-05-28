#!/usr/bin/env node
import fs from "node:fs";

const apiRouterPath = "apps/services-fastapi/src/app/api_router.py";
const apiRouterPy = fs.readFileSync(apiRouterPath, "utf8");
const routeMountRegistry = apiRouterPy.slice(
  apiRouterPy.indexOf("ROUTE_MOUNTS:"),
  apiRouterPy.indexOf("# These module paths"),
);

const routeMountMatches = [...routeMountRegistry.matchAll(/RouteMount\(\s*module_path="([^"]+)"[\s\S]*?required=(True|False)/g)];
const routeMounts = routeMountMatches.map((match) => ({ module: match[1], required: match[2] === "True" }));
const requiredRoutes = routeMounts.filter((mount) => mount.required).map((mount) => mount.module);
const optionalRoutes = routeMounts.filter((mount) => !mount.required).map((mount) => mount.module);
const skippedMatches = [...apiRouterPy.matchAll(/SkippedRouteMount\(\s*module_path="([^"]+)"[\s\S]*?reason="([^"]+)"[\s\S]*?owner="([^"]+)"/g)];
const skippedRoutes = skippedMatches.map((match) => ({ module: match[1], reason: match[2], owner: match[3] }));

const requiredRoutesListExists = requiredRoutes.length > 0;
const staleExternalOptionalAbsent = !optionalRoutes.includes("src.wallet.routes.wallet")
  && !optionalRoutes.includes("src.settlement.routes.settlement");
const staleExternalSkippedIntentionally = ["src.wallet.routes.wallet", "src.settlement.routes.settlement"].every(
  (module) => skippedRoutes.some((route) => route.module === module && route.reason && route.owner === "nestjs"),
);
const aiFraudRouteModulesCovered = [
  "app.api.routes.ai_stories",
  "app.api.routes.ai_generation",
  "app.api.routes.fraud_decision",
].every((module) => routeMounts.some((mount) => mount.module === module));
const captchaRequired = routeMounts.some((mount) => mount.module === "app.api.routes.captcha" && mount.required);
const diagnosticsExplicit = [
  "ROUTE_MOUNT_DIAGNOSTICS",
  "SKIPPED_ROUTE_MOUNTS",
  "FAILED_ROUTE_MOUNTS",
  "MOUNTED_ROUTES",
  "skipped_intentionally",
  "missing_optional_module",
  "required_failed",
].every((token) => apiRouterPy.includes(token));
const nonSecretDiagnostics = !/(HCAPTCHA_SECRET|SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL)\s*=\s*["'][A-Za-z0-9]/.test(apiRouterPy);

const blockers = [];
if (!requiredRoutesListExists) blockers.push("required routes list is empty or missing");
if (!staleExternalOptionalAbsent) blockers.push("optional route list still includes nonexistent src.wallet/src.settlement paths");
if (!staleExternalSkippedIntentionally) blockers.push("stale external wallet/settlement paths are not documented as intentionally skipped");
if (!aiFraudRouteModulesCovered) blockers.push("AI/fraud route modules are missing from route mount coverage");
if (!captchaRequired) blockers.push("captcha route is not required");
if (!diagnosticsExplicit) blockers.push("route mount diagnostics are not explicit enough");
if (!nonSecretDiagnostics) blockers.push("diagnostics source appears to contain secret assignment patterns");

const success = blockers.length === 0;
console.log(JSON.stringify({
  success,
  blockers,
  requiredRoutes,
  optionalRoutes,
  skippedRoutes,
  aiFraudRouteModulesCovered,
  captchaRequired,
  diagnosticsExplicit,
  nonSecretDiagnostics,
}, null, 2));

if (!success) process.exit(1);
