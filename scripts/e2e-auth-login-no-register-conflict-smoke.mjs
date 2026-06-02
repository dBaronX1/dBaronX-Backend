#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });
const file = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

const controller = file("apps/api/src/modules/auth/auth.controller.ts");
const service = file("apps/api/src/modules/auth/auth.service.ts");
const mapper = file("apps/api/src/modules/auth/auth-error.mapper.ts");
const dto = file("apps/api/src/modules/auth/dto/auth.dto.ts");
const webAuthClient = file("apps/web/src/lib/auth/nest-auth-client.ts");
const loginPage = file("apps/web/src/app/login/page.tsx");
const authShell = file("apps/web/src/components/auth/DbxAuthShell.tsx");

const loginMethod = service.slice(service.indexOf("  async login("), service.indexOf("  async me("));
const registerMethod = service.slice(service.indexOf("  async register("), service.indexOf("  async login("));
const loginControllerMethod = controller.slice(controller.indexOf("  @Post(\"login\")"), controller.indexOf("  @Post(\"profile\")"));
const mapperLoginMethod = mapper.slice(mapper.indexOf("export function mapSupabaseLoginError"), mapper.indexOf("export function authErrorResponse"));
const safeMessages = mapper.slice(mapper.indexOf("export const AUTH_SAFE_MESSAGES"), mapper.indexOf("const providerMessageMatchers"));
const customerCopy = `${safeMessages}\n${webAuthClient}\n${loginPage}\n${authShell}`;

check("POST /api/auth/login route exists", /@Post\("login"\)/.test(controller) && /async login/.test(loginControllerMethod));
check("login controller routes to auth.login only", /this\.auth\.login\(body\)/.test(loginControllerMethod) && !/this\.auth\.register\(body\)/.test(loginControllerMethod));
check("login dto is email/password only", /export type LoginAuthDto/.test(dto) && /email\?: string/.test(dto) && /password\?: string/.test(dto));
check("register owns auth user creation", /auth\.admin\.createUser/.test(registerMethod) && /EMAIL_ALREADY_REGISTERED/.test(registerMethod));
check("login does not call register or create-user logic", !/this\.register\(|auth\.admin\.createUser|findExistingAuthUser\(|EMAIL_ALREADY_REGISTERED/.test(loginMethod));
check("EMAIL_ALREADY_REGISTERED is register-only in service", /EMAIL_ALREADY_REGISTERED/.test(registerMethod) && !/EMAIL_ALREADY_REGISTERED/.test(loginMethod));
check("login cannot throw ConflictException", !/ConflictException/.test(loginMethod + controller));
check("login uses dedicated mapper that never returns EMAIL_ALREADY_REGISTERED", /mapSupabaseLoginError/.test(loginMethod) && !/EMAIL_ALREADY_REGISTERED/.test(mapperLoginMethod));
check("invalid login credentials map to INVALID_CREDENTIALS", /INVALID_CREDENTIALS/.test(mapperLoginMethod) && /We could not log you in\. Please check your email and password\./.test(mapper));
check("missing login token maps to auth unavailable", /auth_login_missing_provider_session/.test(loginMethod) && /AUTH_TEMPORARILY_UNAVAILABLE/.test(loginMethod));
check("login success returns usable session/accessToken shape", /safeSessionContract/.test(loginMethod) && /accessToken:\s*session\.accessToken/.test(loginMethod) && /token:\s*session\.token/.test(loginMethod));
check("login hydrates missing profile without register conflict", /loadOrCreateProfile\(data\.user\)/.test(loginMethod) && /upsertProfile\(user/.test(service));
check("customer auth copy uses log in/Login", /This email is already registered\. Please log in instead\./.test(customerCopy) && /We could not log you in\. Please check your email and password\./.test(customerCopy) && /Logging in…/.test(customerCopy) && /Login securely/.test(customerCopy));
check("customer auth copy does not use sign in wording", !/sign in|Sign in|sign-in/i.test(customerCopy));
check("raw provider/internal strings are not returned", !/Supabase|database_url|service_role|stack trace|TypeError|NetworkError/.test(safeMessages));

const failed = checks.filter((item) => !item.pass);
for (const item of checks) console.log(`${item.pass ? "ok" : "not ok"} - ${item.name}`);
if (failed.length) process.exit(1);
