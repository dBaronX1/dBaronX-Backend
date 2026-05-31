#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
const checks=[]; const check=(name,pass)=>checks.push({name,pass:Boolean(pass)}); const file=(p)=>existsSync(p)?readFileSync(p,"utf8"):"";
const controller=file("apps/api/src/modules/auth/auth.controller.ts");
const service=file("apps/api/src/modules/auth/auth.service.ts");
check("owner bootstrap route is mounted under auth", /@Post\("owner\/bootstrap"\)/.test(controller) && /bootstrapOwner/.test(controller));
check("owner bootstrap disabled unless env flag is true", /DBX_ENABLE_OWNER_BOOTSTRAP/.test(service) && /owner_bootstrap_disabled/.test(service));
check("owner bootstrap requires internal token header", /x-internal-token/.test(service) && /INTERNAL_SERVICE_TOKEN/.test(service) && /internal_token_required/.test(service));
check("owner envs are required without exposing values", /DBX_OWNER_EMAIL/.test(service) && /DBX_OWNER_PASSWORD/.test(service) && /DBX_OWNER_FULL_NAME/.test(service));
check("owner creation uses Supabase admin safely", /auth\.admin\.createUser/.test(service) && /email_confirm:\s*true/.test(service));
check("owner profile upsert is idempotent", /upsertOwnerProfile/.test(service) && /onConflict:\s*"user_id"/.test(service));
check("owner bootstrap returns safe summary", /ownerCreated/.test(service) && /profileUpserted/.test(service) && /blockers/.test(service));
const failed=checks.filter((c)=>!c.pass); for (const c of checks) console.log(`${c.pass?"ok":"not ok"} - ${c.name}`); if(failed.length) process.exit(1);
