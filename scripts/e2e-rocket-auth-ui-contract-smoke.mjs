#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";

const checks = [];
function check(name, pass) { checks.push({ name, pass: Boolean(pass) }); }
function file(path) { return existsSync(path) ? readFileSync(path, "utf8") : ""; }

const register = file("apps/web/src/app/register/page.tsx");
const login = file("apps/web/src/app/login/page.tsx");
const shell = file("apps/web/src/components/auth/DbxAuthShell.tsx");
const client = file("apps/web/src/lib/auth/nest-auth-client.ts");
const profile = file("apps/web/src/components/dbx/CustomerAccountPanel.tsx");
const visible = `${register}\n${login}\n${shell}\n${profile}`;

check("registration form calls /api/auth/register", /\/api\/auth\/register/.test(client) && /registerWithApi/.test(register));
check("login form calls /api/auth/login", /\/api\/auth\/login/.test(client) && /loginWithApi/.test(login));
check("me and logout use NestJS auth routes", /\/api\/auth\/me/.test(client) && /\/api\/auth\/logout/.test(client));
check("safe auth error mapping exists", /SAFE_AUTH_MESSAGES/.test(client) && /AUTH_TEMPORARILY_UNAVAILABLE/.test(client));
check("raw backend codes are not rendered", !/auth_service_unavailable/.test(visible));
check("forbidden raw backend patterns are blocked", /RAW_BACKEND_ERROR_PATTERN/.test(client) && /failed_to_fetch/.test(client));
check("loading state exists", /submitting/.test(shell) && /disabled=\{submitDisabled\}/.test(shell));
check("password mismatch handling exists", /Passwords must match/.test(register) && /confirmPassword/.test(register));
check("profile raw metadata is not rendered", !/Additional Info/.test(profile) && !/email_verified|phone_verified|provider internals|service_role/.test(profile));

const failed = checks.filter((item) => !item.pass);
for (const item of checks) console.log(`${item.pass ? "ok" : "not ok"} - ${item.name}`);
if (failed.length) process.exit(1);
