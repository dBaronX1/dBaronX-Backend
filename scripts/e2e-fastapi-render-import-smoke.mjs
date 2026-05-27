#!/usr/bin/env node
import fs from "node:fs";

const requirementsPath = "apps/services-fastapi/requirements.txt";
const loggingPath = "apps/services-fastapi/src/app/core/logging.py";
const mainPath = "apps/services-fastapi/src/app/main.py";
const apiRouterPath = "apps/services-fastapi/src/app/api_router.py";

const read = (path) => fs.readFileSync(path, "utf8");
const requirements = read(requirementsPath);
const loggingPy = read(loggingPath);
const mainPy = read(mainPath);
const apiRouterPy = read(apiRouterPath);

const dependencyPresent = /(^|\n)python-json-logger(?:==[^\n]+)?(?=\n|$)/.test(requirements);
const loggingImportPresent = /from\s+pythonjsonlogger\.jsonlogger\s+import\s+JsonFormatter/.test(loggingPy);
const appImportPath = /from\s+app\.app_factory\s+import\s+create_app/.test(mainPy) && /app\s*=\s*create_app\(\)/.test(mainPy)
  ? "app.main:app"
  : "changed";
const captchaRouteRequired = /module_path="app\.api\.routes\.captcha"[\s\S]*?required=True/.test(apiRouterPy);
const routeMountingPreserved = /if\s+mount\.required\s+and\s+strict_route_mount_enabled\(\):[\s\S]*?raise\s+RuntimeError\(/.test(apiRouterPy);

const secretPatterns = [
  /HCAPTCHA_SECRET\s*=\s*["'][A-Za-z0-9][^"']*["']/,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][A-Za-z0-9][^"']*["']/,
  /DATABASE_URL\s*=\s*["'][A-Za-z0-9][^"']*["']/,
];
const secretLeakDetected = secretPatterns.some((pattern) =>
  [requirements, loggingPy, mainPy, apiRouterPy].some((content) => pattern.test(content)),
);

const blockers = [];
if (!dependencyPresent) blockers.push("Missing python-json-logger in requirements.txt");
if (!loggingImportPresent) blockers.push("logging.py no longer imports pythonjsonlogger JsonFormatter");
if (appImportPath !== "app.main:app") blockers.push("app.main:app import path contract changed");
if (!captchaRouteRequired) blockers.push("captcha route is not required=True");
if (!routeMountingPreserved) blockers.push("required route mount failure no longer raises");
if (secretLeakDetected) blockers.push("secret value pattern detected in checked files");

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
      loggingImportPresent,
      appImportPath,
      captchaRouteRequired,
      routeMountingPreserved,
      nextAction,
    },
    null,
    2,
  ),
);

if (!success) process.exit(1);
