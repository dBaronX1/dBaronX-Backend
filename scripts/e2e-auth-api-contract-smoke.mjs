#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";

const checks = [];
function check(name, pass) { checks.push({ name, pass: Boolean(pass) }); }
function file(path) { return existsSync(path) ? readFileSync(path, "utf8") : ""; }

const controller = file("apps/api/src/modules/auth/auth.controller.ts");
const service = file("apps/api/src/modules/auth/auth.service.ts");
const mapper = file("apps/api/src/modules/auth/auth-error.mapper.ts");
const appModule = file("apps/api/src/app.module.ts");
const combined = `${controller}\n${service}\n${mapper}`;

check("/api/auth/register route exists", /@Post\("register"\)/.test(controller) && /@Controller\("auth"\)/.test(controller));
check("/api/auth/login route exists", /@Post\("login"\)/.test(controller));
check("/api/auth/readiness route exists", /@Get\("readiness"\)/.test(controller));
check("auth module is mounted", /AuthModule/.test(appModule));
check("public auth error mapper exists", /AUTH_TEMPORARILY_UNAVAILABLE/.test(mapper) && /authErrorResponse/.test(mapper));
check("raw auth_service_unavailable not returned", !/auth_service_unavailable/.test(combined));
check("safe public error response contract exists", /errorCode/.test(mapper) && /Account service is temporarily unavailable\. Please try again\./.test(mapper));
check("no service role value exposed", !/SUPABASE_SERVICE_ROLE_KEY\s*=\s*['\"][A-Za-z0-9]/.test(combined));
check("no database url value exposed", !/DATABASE_URL\s*=\s*['\"][A-Za-z0-9]/.test(combined));

const failed = checks.filter((item) => !item.pass);
for (const item of checks) console.log(`${item.pass ? "ok" : "not ok"} - ${item.name}`);
if (failed.length) process.exit(1);
