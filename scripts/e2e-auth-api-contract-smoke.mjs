#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";

const checks = [];
function check(name, pass) { checks.push({ name, pass: Boolean(pass) }); }
function file(path) { return existsSync(path) ? readFileSync(path, "utf8") : ""; }

const authModule = file("apps/api/src/modules/auth/auth.module.ts");
const controller = file("apps/api/src/modules/auth/auth.controller.ts");
const service = file("apps/api/src/modules/auth/auth.service.ts");
const mapper = file("apps/api/src/modules/auth/auth-error.mapper.ts");
const appModule = file("apps/api/src/app.module.ts");
const platformModule = file("apps/api/src/modules/platform/platform.module.ts");
const supabaseService = file("apps/api/src/shared/database/supabase.service.ts");
const combined = `${authModule}\n${controller}\n${service}\n${mapper}\n${appModule}\n${platformModule}\n${supabaseService}`;

const allowedCodes = [
  "AUTH_TEMPORARILY_UNAVAILABLE",
  "INVALID_EMAIL",
  "WEAK_PASSWORD",
  "PASSWORD_MISMATCH",
  "EMAIL_ALREADY_REGISTERED",
  "INVALID_CREDENTIALS",
  "RATE_LIMITED",
  "SESSION_EXPIRED",
  "PROFILE_CREATION_FAILED",
  "VALIDATION_FAILED",
];
const forbiddenClientFacing = [
  "auth_service_unavailable",
  "supabase_error",
  "database_error",
  "internal_service_error",
  "service_role_missing",
  "jwt_error",
  "unexpected_error",
  "failed_to_fetch",
  "TypeError",
  "NetworkError",
];

check("AuthModule exists", /export class AuthModule/.test(authModule) && /AuthController/.test(authModule) && /AuthService/.test(authModule));
check("AuthModule is mounted", /AuthModule/.test(appModule) || /AuthModule/.test(platformModule));
check("GET /api/auth/readiness route exists", /@Controller\(\{\s*path:\s*["']auth["']/.test(controller) && /VERSION_NEUTRAL/.test(controller) && /@Get\("readiness"\)/.test(controller));
check("POST /api/auth/register route exists", /@Post\("register"\)/.test(controller));
check("POST /api/auth/login route exists", /@Post\("login"\)/.test(controller));
const loginMethod = service.slice(service.indexOf("  async login("), service.indexOf("  async me("));
const registerMethod = service.slice(service.indexOf("  async register("), service.indexOf("  async login("));
const loginMapper = mapper.slice(mapper.indexOf("export function mapSupabaseLoginError"), mapper.indexOf("export function authErrorResponse"));
check("login is separate from register", /signInWithPassword/.test(loginMethod) && !/auth\.admin\.createUser|findExistingAuthUser|EMAIL_ALREADY_REGISTERED/.test(loginMethod));
check("EMAIL_ALREADY_REGISTERED is register-only", /EMAIL_ALREADY_REGISTERED/.test(registerMethod) && !/EMAIL_ALREADY_REGISTERED/.test(loginMethod) && !/EMAIL_ALREADY_REGISTERED/.test(loginMapper));
check("login success response includes token/session", /safeSessionContract/.test(loginMethod) && /accessToken:\s*session\.accessToken/.test(loginMethod) && /token:\s*session\.token/.test(loginMethod));
check("POST /api/auth/logout route exists", /@Post\("logout"\)/.test(controller));
check("GET /api/auth/me route exists", /@Get\("me"\)/.test(controller));
check("POST /api/auth/password-reset/request route exists", /@Post\("password-reset\/request"\)/.test(controller));
check("auth error mapper exists", /AUTH_SAFE_MESSAGES/.test(mapper) && /authErrorResponse/.test(mapper) && /mapSupabaseAuthError/.test(mapper) && /mapSupabaseLoginError/.test(mapper));
check("auth customer copy says log in not sign in", /Please log in instead/.test(mapper) && /We could not log you in/.test(mapper) && !/sign in|Sign in|sign-in/i.test(mapper));
for (const code of allowedCodes) check(`allowed public auth code exists: ${code}`, mapper.includes(code));
check("raw auth_service_unavailable is not returned as client-facing code", !/errorCode:\s*["']auth_service_unavailable["']/.test(combined) && !/code:\s*["']auth_service_unavailable["']/.test(combined));
check("readiness includes required profiles table contract", /requiredTables/.test(service) && /profiles:/.test(service));
check("owner bootstrap route exists and is guarded", /@Post\("owner\/bootstrap"\)/.test(controller) && /DBX_ENABLE_OWNER_BOOTSTRAP/.test(service) && /INTERNAL_SERVICE_TOKEN/.test(service) && /x-internal-token/.test(service));
check("readiness includes owner bootstrap configuration flag", /ownerBootstrapConfigured/.test(service));
check("readiness has safe individual env blockers", /supabase_url_missing/.test(service) && /supabase_admin_credentials_missing/.test(service) && /jwt_secret_missing/.test(service));
check("password reset uses generic anti-enumeration message", /If an account exists, reset instructions will be sent\./.test(service));
check("client responses do not expose forbidden internal auth codes", forbiddenClientFacing.every((term) => !new RegExp(`errorCode:\\s*["']${term}["']`).test(combined)));
check("no service role value exposed", !/SUPABASE_SERVICE_ROLE_KEY\s*=\s*['\"][A-Za-z0-9]/.test(combined));
check("no database url value exposed", !/DATABASE_URL\s*=\s*['\"][A-Za-z0-9]/.test(combined));
check("no JWT secret value exposed", !/JWT_SECRET\s*=\s*['\"][A-Za-z0-9]/.test(combined));
check("no cookie secret value exposed", !/COOKIE_SECRET\s*=\s*['\"][A-Za-z0-9]/.test(combined));
check("no internal token value exposed", !/INTERNAL_SERVICE_TOKEN\s*=\s*['\"][A-Za-z0-9]/.test(combined));

const failed = checks.filter((item) => !item.pass);
for (const item of checks) console.log(`${item.pass ? "ok" : "not ok"} - ${item.name}`);
if (failed.length) process.exit(1);
