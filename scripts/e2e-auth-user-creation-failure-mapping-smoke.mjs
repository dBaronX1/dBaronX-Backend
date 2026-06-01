import { readFileSync } from "node:fs";

const mapper = readFileSync("apps/api/src/modules/auth/auth-error.mapper.ts", "utf8");
const service = readFileSync("apps/api/src/modules/auth/auth.service.ts", "utf8");

function check(condition, message) {
  if (!condition) throw new Error(message);
}

check(mapper.includes('"AUTH_DATABASE_USER_CREATION_FAILED"'), "safe auth DB creation failure code must be defined");
check(mapper.includes("Account service is temporarily unavailable. Please run the Supabase auth user creation diagnostic."), "safe auth DB creation failure message must be defined");
check(/database error creating new user/i.test(mapper), "Supabase database user-creation failure must be mapped by message");
check(/code:\s*error\.errorCode/.test(mapper), "auth error responses must include safe code alias");
check(/errorCode:\s*error\.errorCode/.test(mapper), "auth error responses must preserve errorCode");
check(service.includes("authUserCreationDiagnosticAvailable: true"), "auth readiness must advertise diagnostic availability");
check(service.includes("supabase/sql/diagnostics/auth_user_creation_diagnostic.sql"), "auth readiness must recommend the diagnostic SQL path");
check(!/message:\s*["'].*Database error creating new user/i.test(service), "service must not return raw provider error as a customer message");
console.log("Auth user creation failure mapping smoke passed");
