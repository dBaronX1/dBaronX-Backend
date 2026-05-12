#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = {
  register: "apps/web/src/app/register/page.tsx",
  signup: "apps/web/src/app/signup/page.tsx",
  login: "apps/web/src/app/login/page.tsx",
  shell: "apps/web/src/components/auth/RocketAuthShell.tsx",
};
const blockers = [];
for (const [name, file] of Object.entries(files)) {
  if (!existsSync(file)) blockers.push(`${name}_missing`);
}
const shell = existsSync(files.shell) ? readFileSync(files.shell, "utf8") : "";
const signup = existsSync(files.signup) ? readFileSync(files.signup, "utf8") : "";
const register = existsSync(files.register) ? readFileSync(files.register, "utf8") : "";
const login = existsSync(files.login) ? readFileSync(files.login, "utf8") : "";

const socialLinksPreserved = /x\.com\/dbaronx/i.test(shell) && /instagram\.com\/dbaronx/i.test(shell) && /tiktok\.com\/@dbaronx/i.test(shell);
const polishedAuthShellPresent = /data-rocket-auth-ui="preserved"/.test(shell) && /radial-gradient|linear-gradient/.test(shell);
const signupDoesNotOwnPlainFallback = /redirect\(`\/register/.test(signup) && !/Use email\/password signup|maxWidth:\s*520/.test(signup);
const registerUsesRocketShell = /RocketAuthShell/.test(register);
const loginUsesRocketShell = /RocketAuthShell/.test(login);

if (!socialLinksPreserved) blockers.push("social_links_not_detected");
if (!polishedAuthShellPresent) blockers.push("polished_auth_shell_not_detected");
if (!signupDoesNotOwnPlainFallback) blockers.push("signup_plain_fallback_still_detected");
if (!registerUsesRocketShell) blockers.push("register_not_using_rocket_shell");
if (!loginUsesRocketShell) blockers.push("login_not_using_rocket_shell");

const result = {
  success: blockers.length === 0,
  blockers,
  socialLinksPreserved,
  polishedAuthShellPresent,
  signupDoesNotOwnPlainFallback,
  registerUsesRocketShell,
  loginUsesRocketShell,
  nextManualStep: blockers.length ? "Restore Rocket auth shell and social links before deploying Fly Web." : "Deploy Fly Web and visually confirm /register and /login.",
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);
