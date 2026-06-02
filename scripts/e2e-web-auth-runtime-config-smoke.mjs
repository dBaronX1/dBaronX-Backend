#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const WEB_BASE_URL = (process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
const blockers = [];
const secretNames = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "STRIPE_SECRET_KEY",
  "TELEGRAM_BOT_TOKEN",
  "CJ_ACCESS_TOKEN",
];
const forbiddenCustomerText = [
  "Set NEXT_PUBLIC_SUPABASE_URL",
  "Set NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "Supabase auth is not configured",
];
const expectedPublicConfigKeys = [
  "supabaseUrl",
  "supabaseAnonKey",
  "apiBaseUrl",
  "medusaBackendUrl",
  "medusaPublishableKey",
  "siteUrl",
];

const files = {
  register: "apps/web/src/app/register/page.tsx",
  signup: "apps/web/src/app/signup/page.tsx",
  login: "apps/web/src/app/login/page.tsx",
  signin: "apps/web/src/app/signin/page.tsx",
  callback: "apps/web/src/app/auth/callback/route.ts",
  onboarding: "apps/web/src/app/onboarding/page.tsx",
  publicConfigRoute: "apps/web/src/app/api/public-config/route.ts",
  publicConfigLib: "apps/web/src/lib/public-config.ts",
  runtimeClient: "apps/web/src/lib/supabase/runtime-client.ts",
  rocketShell: "apps/web/src/components/auth/RocketAuthShell.tsx",
};

function read(file) {
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

function addBlocker(condition, code) {
  if (condition) blockers.push(code);
}

async function fetchText(path, redirect = "manual") {
  if (!WEB_BASE_URL) return null;
  try {
    const response = await fetch(`${WEB_BASE_URL}${path}`, { redirect });
    const text = await response.text().catch(() => "");
    return { status: response.status, location: response.headers.get("location") || "", text };
  } catch (error) {
    return { status: 0, location: "", text: String(error?.message || error) };
  }
}

async function fetchJson(path) {
  if (!WEB_BASE_URL) return null;
  try {
    const response = await fetch(`${WEB_BASE_URL}${path}`, { redirect: "manual" });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: response.status, text, json };
  } catch (error) {
    return { status: 0, text: String(error?.message || error), json: null };
  }
}

const source = Object.values(files).map(read).join("\n");

const registerRoutePresent = existsSync(files.register);
const signupRoutePresent = existsSync(files.signup);
const loginRoutePresent = existsSync(files.login);
const signinRoutePresent = existsSync(files.signin);
const callbackRoutePresent = existsSync(files.callback);
const onboardingRoutePresent = existsSync(files.onboarding);
const publicConfigRoutePresent = existsSync(files.publicConfigRoute) && existsSync(files.publicConfigLib);

const registerSource = read(files.register);
const signupSource = read(files.signup);
const loginSource = read(files.login);
const signinSource = read(files.signin);
const callbackSource = read(files.callback);
const publicConfigSource = `${read(files.publicConfigRoute)}\n${read(files.publicConfigLib)}`;
const rocketSource = read(files.rocketShell);

const signupPreservesQuery = ["ref", "invite", "init", "next"].every((key) => signupSource.includes(key)) && signupSource.includes("/register");
const signinPreservesQuery = ["ref", "invite", "init", "next"].every((key) => signinSource.includes(key)) && signinSource.includes("/login");
const publicConfigHasOnlyExpectedKeys = expectedPublicConfigKeys.every((key) => publicConfigSource.includes(key));
const forbiddenPublicConfigSecretNames = secretNames.filter((name) => publicConfigSource.includes(name));
const customerSafeSourceErrors = !forbiddenCustomerText.some((text) => source.includes(text));
const fullNameFieldReadySource = /Full Name/.test(rocketSource) && /fullName/.test(registerSource) && /full_name/.test(registerSource);
const emailFieldReadySource = /Email/.test(rocketSource) && /type="email"/.test(rocketSource);
const passwordFieldReadySource = /Password/.test(rocketSource) && /minLength=\{isRegister \? 8/.test(rocketSource);
const confirmPasswordFieldReadySource = /Confirm Password/.test(rocketSource) && /confirmPassword/.test(registerSource) && /Passwords must match/.test(registerSource);
const emailConfirmationUxReadySource = registerSource.includes("Account created. Check your email to confirm your account, then return to log in.") && registerSource.includes("/auth/callback?next=");
const resendConfirmationReadySource = registerSource.includes("Resend confirmation email") && registerSource.includes("supabase.auth.resend") && registerSource.includes('type: "signup"');
const metadataSource = `${registerSource}\n${read("apps/web/src/lib/auth/referral-capture.ts")}`;
const metadataReadySource = ["display_name", "referral_code", "invite_code", "initiation_code", "web_register", "onboarding_target"].every((text) => metadataSource.includes(text));
const callbackSafeSource = callbackSource.includes('safeLocalPath(url.searchParams.get("next"), "/onboarding")') && callbackSource.includes("exchangeCodeForSession");
const socialLinksLikelyPresent = /x\.com\/dbaronx|instagram\.com\/dbaronx|tiktok\.com\/@dbaronx/i.test(rocketSource);
const rocketUiLikelyPreservedSource =
  /data-rocket-auth-ui="preserved"/.test(rocketSource) &&
  /radial-gradient|linear-gradient/.test(rocketSource) &&
  socialLinksLikelyPresent &&
  !/maxWidth:\s*520|Use email\/password signup/.test(registerSource);

addBlocker(!registerRoutePresent, "register_route_missing");
addBlocker(!signupRoutePresent, "signup_route_missing");
addBlocker(!loginRoutePresent, "login_route_missing");
addBlocker(!signinRoutePresent, "signin_route_missing");
addBlocker(!callbackRoutePresent, "callback_route_missing");
addBlocker(!onboardingRoutePresent, "onboarding_route_missing");
addBlocker(!publicConfigRoutePresent, "public_config_route_missing");
addBlocker(!signupPreservesQuery, "signup_does_not_preserve_auth_query");
addBlocker(!signinPreservesQuery, "signin_does_not_preserve_auth_query");
addBlocker(!publicConfigHasOnlyExpectedKeys, "public_config_contract_incomplete");
addBlocker(forbiddenPublicConfigSecretNames.length > 0, "public_config_source_references_forbidden_secret_names");
addBlocker(!customerSafeSourceErrors, "customer_error_mentions_env_names");
addBlocker(!fullNameFieldReadySource, "full_name_field_missing");
addBlocker(!emailFieldReadySource, "email_field_missing");
addBlocker(!passwordFieldReadySource, "password_field_missing");
addBlocker(!confirmPasswordFieldReadySource, "confirm_password_field_missing");
addBlocker(!emailConfirmationUxReadySource, "email_confirmation_ux_missing");
addBlocker(!resendConfirmationReadySource, "resend_confirmation_missing");
addBlocker(!metadataReadySource, "signup_metadata_incomplete");
addBlocker(!callbackSafeSource, "callback_not_safe_or_not_defaulting_to_onboarding");
addBlocker(!rocketUiLikelyPreservedSource, "rocket_auth_ui_not_detected");

let registerProbe = null;
let signupProbe = null;
let loginProbe = null;
let signinProbe = null;
let callbackProbe = null;
let configProbe = null;
let htmlSecretLeakDetected = false;
let htmlCustomerUnsafe = false;
let publicConfigSafeRuntimeKeys = true;
let publicConfigSupabaseRuntimeReady = false;
let rocketUiRuntimeLikelyPreserved = false;
let socialLinksRuntimeLikelyPresent = false;
let fullNameFieldReadyRuntime = false;
let emailFieldReadyRuntime = false;
let passwordFieldReadyRuntime = false;
let confirmPasswordFieldReadyRuntime = false;
let emailConfirmationUxReadyRuntime = false;
let resendConfirmationReadyRuntime = false;

if (WEB_BASE_URL) {
  registerProbe = await fetchText("/register?ref=smoke&invite=invite&init=init&next=/onboarding", "follow");
  signupProbe = await fetchText("/signup?ref=smoke&invite=invite&init=init&next=/onboarding", "manual");
  loginProbe = await fetchText("/login?next=/dashboard", "follow");
  signinProbe = await fetchText("/signin?next=/dashboard", "manual");
  callbackProbe = await fetchText("/auth/callback?next=/dashboard", "manual");
  configProbe = await fetchJson("/api/public-config");

  const registerHtml = registerProbe?.text || "";
  const html = [registerProbe, signupProbe, loginProbe, signinProbe, callbackProbe]
    .filter(Boolean)
    .map((probe) => `${probe.location}\n${probe.text}`)
    .join("\n");
  htmlSecretLeakDetected = secretNames.some((name) => html.includes(name));
  htmlCustomerUnsafe = forbiddenCustomerText.some((text) => html.includes(text));
  socialLinksRuntimeLikelyPresent = /x\.com\/dbaronx|instagram\.com\/dbaronx|tiktok\.com\/@dbaronx/i.test(html);
  rocketUiRuntimeLikelyPreserved = /data-rocket-auth-ui="preserved"|Rocket-grade commerce access|Launch your/.test(html) && socialLinksRuntimeLikelyPresent;
  fullNameFieldReadyRuntime = /Full Name/.test(registerHtml);
  emailFieldReadyRuntime = /Email/.test(registerHtml);
  passwordFieldReadyRuntime = /Password/.test(registerHtml);
  confirmPasswordFieldReadyRuntime = /Confirm Password/.test(registerHtml);
  emailConfirmationUxReadyRuntime = /confirm your account|return to log in/i.test(registerHtml);
  resendConfirmationReadyRuntime = /Resend confirmation email|Resend confirmation/i.test(registerHtml);

  const json = configProbe?.json;
  const keys = json && typeof json === "object" ? Object.keys(json) : [];
  publicConfigSafeRuntimeKeys = keys.length > 0 && keys.every((key) => expectedPublicConfigKeys.includes(key));
  publicConfigSupabaseRuntimeReady = Boolean(json?.supabaseUrl && json?.supabaseAnonKey);

  addBlocker(!(registerProbe.status >= 200 && registerProbe.status < 400), "register_not_reachable");
  addBlocker(!(signupProbe.status >= 300 && signupProbe.status < 400 && signupProbe.location.includes("/register")), "signup_not_redirecting_to_register");
  addBlocker(!(loginProbe.status >= 200 && loginProbe.status < 400), "login_not_reachable");
  addBlocker(!(signinProbe.status >= 300 && signinProbe.status < 400 && signinProbe.location.includes("/login")), "signin_not_redirecting_to_login");
  addBlocker(!(callbackProbe.status >= 300 && callbackProbe.status < 400), "callback_not_redirecting");
  addBlocker(!(configProbe.status >= 200 && configProbe.status < 300), "public_config_not_reachable");
  addBlocker(!publicConfigSafeRuntimeKeys, "public_config_runtime_has_unsafe_keys");
  if (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    addBlocker(!publicConfigSupabaseRuntimeReady, "supabase_public_config_missing_when_env_set");
  }
  addBlocker(htmlSecretLeakDetected, "secret_name_leaked_in_page_html");
  addBlocker(htmlCustomerUnsafe, "unsafe_env_instruction_in_page_html");
  addBlocker(!rocketUiRuntimeLikelyPreserved, "rocket_ui_not_detected_at_runtime");
  addBlocker(!fullNameFieldReadyRuntime, "full_name_field_not_detected_at_runtime");
  addBlocker(!emailFieldReadyRuntime, "email_field_not_detected_at_runtime");
  addBlocker(!passwordFieldReadyRuntime, "password_field_not_detected_at_runtime");
  addBlocker(!confirmPasswordFieldReadyRuntime, "confirm_password_field_not_detected_at_runtime");
}

const secretLeakDetected = htmlSecretLeakDetected || forbiddenPublicConfigSecretNames.length > 0;
const customerSafeErrors = customerSafeSourceErrors && !htmlCustomerUnsafe;
const registerReady = registerRoutePresent && (!WEB_BASE_URL || (registerProbe.status >= 200 && registerProbe.status < 400));
const signupReady = signupRoutePresent && signupPreservesQuery && (!WEB_BASE_URL || (signupProbe.status >= 300 && signupProbe.status < 400 && signupProbe.location.includes("/register")));
const loginReady = loginRoutePresent && (!WEB_BASE_URL || (loginProbe.status >= 200 && loginProbe.status < 400));
const callbackReady = callbackRoutePresent && callbackSafeSource && (!WEB_BASE_URL || (callbackProbe.status >= 300 && callbackProbe.status < 400));
const publicConfigReady = publicConfigRoutePresent && publicConfigSafeRuntimeKeys;
const supabasePublicConfigReady = WEB_BASE_URL ? publicConfigSupabaseRuntimeReady : /supabaseUrl|supabaseAnonKey/.test(publicConfigSource);
const fullNameFieldReady = fullNameFieldReadySource && (!WEB_BASE_URL || fullNameFieldReadyRuntime);
const emailFieldReady = emailFieldReadySource && (!WEB_BASE_URL || emailFieldReadyRuntime);
const passwordFieldReady = passwordFieldReadySource && (!WEB_BASE_URL || passwordFieldReadyRuntime);
const confirmPasswordFieldReady = confirmPasswordFieldReadySource && (!WEB_BASE_URL || confirmPasswordFieldReadyRuntime);
const emailConfirmationUxReady = emailConfirmationUxReadySource && (!WEB_BASE_URL || emailConfirmationUxReadyRuntime);
const resendConfirmationReady = resendConfirmationReadySource && (!WEB_BASE_URL || resendConfirmationReadyRuntime);
const rocketUiLikelyPreserved = rocketUiLikelyPreservedSource && (!WEB_BASE_URL || rocketUiRuntimeLikelyPreserved);

const result = {
  success: blockers.length === 0,
  blockers,
  registerReady,
  signupReady,
  loginReady,
  callbackReady,
  publicConfigReady,
  supabasePublicConfigReady,
  fullNameFieldReady,
  emailFieldReady,
  passwordFieldReady,
  confirmPasswordFieldReady,
  emailConfirmationUxReady,
  resendConfirmationReady,
  customerSafeErrors,
  rocketUiLikelyPreserved,
  secretLeakDetected,
  nextManualStep: blockers.length
    ? "Fix the listed auth/runtime-config blockers, redeploy Fly Web, then rerun with WEB_BASE_URL=https://dbaronx-web.fly.dev."
    : WEB_BASE_URL
      ? "Fly Web auth routes and runtime public config are ready for a manual Supabase signup/login and email confirmation test."
      : "Run again against Fly Web with WEB_BASE_URL=https://dbaronx-web.fly.dev after deploy.",
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);
