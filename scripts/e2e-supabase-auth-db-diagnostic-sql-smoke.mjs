import { readFileSync, existsSync } from "node:fs";

const file = "supabase/sql/diagnostics/auth_user_creation_diagnostic.sql";
const forbiddenWrite = /\b(insert|update|delete|truncate|drop|alter|create|grant|revoke|comment\s+on|security\s+definer)\b/i;
const required = [
  /auth_users_non_internal_triggers/i,
  /pg_get_triggerdef/i,
  /pg_get_functiondef/i,
  /profile_tables_found/i,
  /public_profiles_columns/i,
  /app_public_profiles_columns/i,
  /profile_table_constraints/i,
  /profile_related_functions/i,
  /profile_rls_status/i,
  /profile_not_null_without_defaults/i,
  /auth_users_duplicate_custom_trigger_functions/i,
  /auth\.users|n\.nspname\s*=\s*'auth'/i,
];
const secretPatterns = [
  /DATABASE_URL\s*=\s*[^\s]+/i,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s]+/i,
  /JWT_SECRET\s*=\s*[^\s]+/i,
  /COOKIE_SECRET\s*=\s*[^\s]+/i,
  /INTERNAL_SERVICE_TOKEN\s*=\s*[^\s]+/i,
];

function check(condition, message) {
  if (!condition) throw new Error(message);
}

check(existsSync(file), `${file} must exist`);
const sql = readFileSync(file, "utf8");
const withoutComments = sql
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");
check(!forbiddenWrite.test(withoutComments), "diagnostic SQL must remain read-only");
for (const pattern of required) check(pattern.test(sql), `diagnostic SQL missing ${pattern}`);
for (const pattern of secretPatterns) check(!pattern.test(sql), `diagnostic SQL contains forbidden secret-like assignment ${pattern}`);
console.log("Supabase auth DB diagnostic SQL smoke passed");
