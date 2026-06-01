#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });
const file = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");

const controller = file("apps/api/src/modules/auth/auth.controller.ts");
const service = file("apps/api/src/modules/auth/auth.service.ts");
const combined = `${controller}\n${service}`;
const requiredCodes = [
  "bootstrap_disabled",
  "internal_token_missing",
  "internal_token_invalid",
  "owner_email_missing",
  "owner_password_missing",
  "supabase_admin_unavailable",
  "owner_create_failed",
  "profile_upsert_failed",
];

check("owner bootstrap route is mounted under auth", /@Post\("owner\/bootstrap"\)/.test(controller) && /bootstrapOwner/.test(controller));
check("owner bootstrap disabled unless env flag is true", /DBX_ENABLE_OWNER_BOOTSTRAP/.test(service) && /bootstrap_disabled/.test(service));
check("owner bootstrap requires internal token header", /x-internal-token/.test(service) && /INTERNAL_SERVICE_TOKEN/.test(service));
check("owner bootstrap distinguishes missing and invalid token", /internal_token_missing/.test(service) && /internal_token_invalid/.test(service));
check("owner envs are required without exposing values", /DBX_OWNER_EMAIL/.test(service) && /DBX_OWNER_PASSWORD/.test(service) && /DBX_OWNER_FULL_NAME/.test(service));
check("owner creation uses Supabase admin safely", /auth\.admin\.createUser/.test(service) && /email_confirm:\s*true/.test(service));
check("owner bootstrap is idempotent", /findAuthUserByEmail/.test(service) && /ownerAlreadyExisted/.test(service) && /ownerCreated/.test(service));
check("owner profile upsert is attempted without hiding owner creation", /profile_upsert_failed/.test(service) && /profileUpserted:\s*false/.test(service));
check("owner profile upsert is idempotent", /upsertOwnerProfile/.test(service) && /onConflict:\s*"user_id"/.test(service));
check("owner bootstrap returns exact safe summary shape", /success:\s*false/.test(service) && /success:\s*true/.test(service) && /blockers/.test(service) && /code/.test(service) && /message/.test(service));
for (const code of requiredCodes) check(`owner bootstrap code exists: ${code}`, combined.includes(code));
check("owner bootstrap no longer uses generic internal_token_required blocker", !/internal_token_required/.test(service));
check("owner bootstrap controller returns service value directly", /json\(result\.value\)/.test(controller) && /ownerBootstrapStatus/.test(controller));
const bootstrapMethod = service.slice(service.indexOf("async bootstrapOwner"), service.indexOf("async requestPasswordReset"));
check("owner bootstrap does not return token or password", !/password\s*:/.test(bootstrapMethod) && !/token\s*:/.test(bootstrapMethod) && !/internalToken/.test(bootstrapMethod));

const failed = checks.filter((c) => !c.pass);
for (const c of checks) console.log(`${c.pass ? "ok" : "not ok"} - ${c.name}`);
if (failed.length) process.exit(1);
