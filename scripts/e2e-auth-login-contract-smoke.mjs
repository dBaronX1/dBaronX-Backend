#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });
const file = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");

const controller = file("apps/api/src/modules/auth/auth.controller.ts");
const service = file("apps/api/src/modules/auth/auth.service.ts");
const mapper = file("apps/api/src/modules/auth/auth-error.mapper.ts");
const dto = file("apps/api/src/modules/auth/dto/auth.dto.ts");
const combined = `${controller}\n${service}\n${mapper}\n${dto}`;

check("POST /api/auth/login route exists", /@Post\("login"\)/.test(controller) && /async login/.test(controller));
check("login dto accepts email and password", /export type LoginAuthDto/.test(dto) && /email\?:\s*string/.test(dto) && /password\?:\s*string/.test(dto));
check("login validates email/password safely", /validateLogin/.test(service) && /INVALID_CREDENTIALS/.test(service));
check("login calls Supabase password auth", /signInWithPassword/.test(service));
check("login returns safe user", /user:\s*profile\.value/.test(service) && /SafeAuthUser/.test(service));
check("login returns session.accessToken", /session/.test(service) && /accessToken:\s*input\.apiAccessToken/.test(service));
check("login returns token alias", /token:\s*input\.apiAccessToken/.test(service) && /token:\s*session\.token/.test(service));
check("login returns top-level accessToken alias", /accessToken:\s*session\.accessToken/.test(service));
check("wrong credentials map to INVALID_CREDENTIALS", /INVALID_CREDENTIALS/.test(mapper) && /We could not log you in\. Please check your email and password\./.test(mapper));
check("email not confirmed is not leaked raw", /email\.\*not\.\*confirm|not\.\*confirmed/.test(mapper) && /AUTH_TEMPORARILY_UNAVAILABLE/.test(mapper));
check("registration confirms email for immediate login", /auth\.admin\.createUser/.test(service) && /email_confirm:\s*true/.test(service));
check("/me accepts bearer token", /@Get\("me"\)/.test(controller) && /extractBearer/.test(service) && /auth\.getUser\(token\)/.test(service));
check("/me returns safe user only", /return \{ ok: true, value: \{ user: profile\.value \} \}/.test(service));
const safeUserMethod = service.slice(service.indexOf("private safeUserFromProfile"), service.indexOf("private extractBearer"));
check("safe user does not expose raw metadata", !/app_metadata|user_metadata|email_verified|phone_verified|source|sub/.test(safeUserMethod));
check("auth response mapper exposes code alias", /code:\s*error\.errorCode/.test(mapper));
check("no secret values are embedded", !/(INTERNAL_SERVICE_TOKEN|DBX_OWNER_PASSWORD|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*["'][A-Za-z0-9]/.test(combined));

const failed = checks.filter((c) => !c.pass);
for (const c of checks) console.log(`${c.pass ? "ok" : "not ok"} - ${c.name}`);
if (failed.length) process.exit(1);
