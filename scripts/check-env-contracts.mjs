#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const contracts = {
  ".env.example": [
    "NODE_ENV",
    "INTERNAL_SERVICE_TOKEN",
    "API_BASE_URL",
    "FASTAPI_BASE_URL",
    "MEDUSA_BASE_URL",
  ],
  "apps/web/.env.example": [
    "NEXT_PUBLIC_API_BASE_URL",
    "NEST_API_URL",
  ],
  "apps/api/.env.example": [
    "NODE_ENV",
    "APP_URL",
    "FRONTEND_URL",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "MEDUSA_BASE_URL",
    "FASTAPI_BASE_URL",
    "INTERNAL_SERVICE_TOKEN",
  ],
  "apps/services-fastapi/.env.example": [
    "APP_ENV",
    "FRONTEND_URL",
    "NESTJS_BASE_URL",
    "INTERNAL_SERVICE_TOKEN",
    "JWT_SECRET",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ],
  "apps/medusa/.env.example": [
    "DATABASE_URL",
    "JWT_SECRET",
    "COOKIE_SECRET",
    "MEDUSA_BACKEND_URL",
  ],
  "apps/telegram-bot/.env.example": [
    "TELEGRAM_BOT_TOKEN",
    "NESTJS_BASE_URL",
    "FASTAPI_BASE_URL",
    "INTERNAL_SERVICE_TOKEN",
  ],
};

const repoRoot = process.cwd();
let hasErrors = false;

for (const [relativeFile, requiredKeys] of Object.entries(contracts)) {
  const fullPath = path.join(repoRoot, relativeFile);

  if (!fs.existsSync(fullPath)) {
    console.error(`✗ Missing env contract file: ${relativeFile}`);
    hasErrors = true;
    continue;
  }

  const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);
  const keys = new Set(
    lines
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => line.slice(0, line.indexOf("=")).trim()),
  );

  const missingKeys = requiredKeys.filter((key) => !keys.has(key));

  if (missingKeys.length) {
    console.error(
      `✗ ${relativeFile} missing required keys: ${missingKeys.join(", ")}`,
    );
    hasErrors = true;
    continue;
  }

  console.log(`✓ ${relativeFile} (${keys.size} keys)`);
}

if (hasErrors) {
  console.error("\nEnvironment contract check failed.");
  process.exit(1);
}

console.log("\nEnvironment contracts are valid.");
