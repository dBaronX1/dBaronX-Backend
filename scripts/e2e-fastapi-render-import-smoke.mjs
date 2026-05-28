#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const requirementsPath = "apps/services-fastapi/requirements.txt";
const loggingPath = "apps/services-fastapi/src/app/core/logging.py";
const mainPath = "apps/services-fastapi/src/app/main.py";
const apiRouterPath = "apps/services-fastapi/src/app/api_router.py";
const serviceSrcPath = "apps/services-fastapi/src";

const read = (path) => fs.readFileSync(path, "utf8");
const requirements = read(requirementsPath);
const loggingPy = read(loggingPath);
const mainPy = read(mainPath);
const apiRouterPy = read(apiRouterPath);
const routeMountRegistry = apiRouterPy.slice(
  apiRouterPy.indexOf("ROUTE_MOUNTS:"),
  apiRouterPy.indexOf("# These module paths"),
);

const hasDependency = (name) => new RegExp(`(^|\\n)${name}(?:==[^\\n]+)?(?=\\n|$)`).test(requirements);
const dependencyPresent = hasDependency("python-json-logger");
const supabaseDependencyPresent = /(^|\n)supabase==2\.18\.1(?=\n|$)/.test(requirements);
const loggingImportPresent = /from\s+pythonjsonlogger\.jsonlogger\s+import\s+JsonFormatter/.test(loggingPy);
const appImportPath = /from\s+app\.app_factory\s+import\s+create_app/.test(mainPy) && /app\s*=\s*create_app\(\)/.test(mainPy)
  ? "app.main:app"
  : "changed";
const captchaRouteRequired = /module_path="app\.api\.routes\.captcha"[\s\S]*?required=True/.test(apiRouterPy);
const routeMountingPreserved = /if\s+mount\.required\s+and\s+strict_route_mount_enabled\(\):[\s\S]*?raise\s+RuntimeError\(/.test(apiRouterPy);
const aiFraudRoutersCovered = [
  "app.api.routes.ai_stories",
  "app.api.routes.ai_generation",
  "app.api.routes.fraud_decision",
].every((modulePath) => routeMountRegistry.includes(`module_path="${modulePath}"`));
const staleExternalRoutesSkipped = [
  "src.wallet.routes.wallet",
  "src.settlement.routes.settlement",
].every((modulePath) => {
  const routeMountAttempt = routeMountRegistry.includes(`module_path="${modulePath}"`);
  const skippedRecord = new RegExp(`SkippedRouteMount\\([\\s\\S]*?module_path="${modulePath.replaceAll(".", "\\.")}"`).test(apiRouterPy);
  return !routeMountAttempt && skippedRecord;
});
const explicitDiagnosticsPresent = [
  "mounted",
  "skipped_intentionally",
  "missing_optional_module",
  "required_failed",
].every((status) => apiRouterPy.includes(`"${status}"`)) && apiRouterPy.includes("ROUTE_MOUNT_DIAGNOSTICS");

const secretPatterns = [
  /HCAPTCHA_SECRET\s*=\s*["'][A-Za-z0-9][^"']*["']/,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][A-Za-z0-9][^"']*["']/,
  /DATABASE_URL\s*=\s*["'][A-Za-z0-9][^"']*["']/,
];
const secretLeakDetected = secretPatterns.some((pattern) =>
  [requirements, loggingPy, mainPy, apiRouterPy].some((content) => pattern.test(content)),
);

const supabaseShimDir = fs.mkdtempSync(path.join(os.tmpdir(), "dbx-fastapi-supabase-smoke-"));
fs.mkdirSync(path.join(supabaseShimDir, "supabase"));
fs.writeFileSync(
  path.join(supabaseShimDir, "supabase", "__init__.py"),
  "class Client:\n    pass\ndef create_client(*args, **kwargs):\n    return Client()\n",
);

const importProbe = spawnSync(
  process.env.PYTHON || "python",
  [
    "-c",
    [
      "import importlib",
      "for module in ('app.api.routes.ai_stories','app.api.routes.ai_generation','app.api.routes.fraud_decision'):",
      "    importlib.import_module(module)",
      "print('fastapi-ai-fraud-import-ok')",
    ].join("\n"),
  ],
  {
    cwd: "apps/services-fastapi",
    env: {
      ...process.env,
      PYTHONPATH: `${path.relative("apps/services-fastapi", supabaseShimDir)}:src`,
      APP_ENV: process.env.APP_ENV || "test",
      NESTJS_BASE_URL: process.env.NESTJS_BASE_URL || "https://nestjs.invalid",
      FRONTEND_URL: process.env.FRONTEND_URL || "https://frontend.invalid",
      SUPABASE_URL: process.env.SUPABASE_URL || "https://supabase.invalid",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "smoke-service-role-key-placeholder",
      INTERNAL_SERVICE_TOKEN: process.env.INTERNAL_SERVICE_TOKEN || "smoke-internal-token-placeholder",
      JWT_SECRET: process.env.JWT_SECRET || "smoke-jwt-secret-placeholder",
    },
    encoding: "utf8",
  },
);
const importProbeSucceeded = importProbe.status === 0;
const importProbeMissingSupabase = /ModuleNotFoundError: No module named 'supabase'/.test(
  `${importProbe.stderr}\n${importProbe.stdout}`,
);

const blockers = [];
if (!dependencyPresent) blockers.push("Missing python-json-logger in requirements.txt");
if (!supabaseDependencyPresent) blockers.push("Missing pinned supabase==2.18.1 in requirements.txt");
if (!loggingImportPresent) blockers.push("logging.py no longer imports pythonjsonlogger JsonFormatter");
if (appImportPath !== "app.main:app") blockers.push("app.main:app import path contract changed");
if (!captchaRouteRequired) blockers.push("captcha route is not required=True");
if (!routeMountingPreserved) blockers.push("required route mount failure no longer raises");
if (!aiFraudRoutersCovered) blockers.push("AI/fraud route modules are not covered by the route registry");
if (!staleExternalRoutesSkipped) blockers.push("stale src.wallet/src.settlement paths are still mounted blindly or lack intentional skip records");
if (!explicitDiagnosticsPresent) blockers.push("route mount diagnostics do not expose required statuses");
if (secretLeakDetected) blockers.push("secret value pattern detected in checked files");
if (!importProbeSucceeded) {
  blockers.push(
    importProbeMissingSupabase
      ? "AI/fraud router import failed because supabase is not importable"
      : "AI/fraud router import probe failed",
  );
}

const success = blockers.length === 0;
const nextAction = success
  ? "Proceed with Render deploy using root=apps/services-fastapi and start=PYTHONPATH=src uvicorn app.main:app --host 0.0.0.0 --port $PORT"
  : "Fix blockers before deployment";

console.log(
  JSON.stringify(
    {
      success,
      blockers,
      dependencyPresent,
      supabaseDependencyPresent,
      loggingImportPresent,
      appImportPath,
      captchaRouteRequired,
      routeMountingPreserved,
      aiFraudRoutersCovered,
      staleExternalRoutesSkipped,
      explicitDiagnosticsPresent,
      importProbeSucceeded,
      importProbeMissingSupabase,
      nextAction,
    },
    null,
    2,
  ),
);

if (!success) process.exit(1);
