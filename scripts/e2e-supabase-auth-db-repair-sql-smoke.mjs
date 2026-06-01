import { readFileSync, existsSync } from "node:fs";

const file = "supabase/sql/repairs/auth_user_creation_safe_repair.sql";
const required = [
  /create or replace function public\.handle_new_user\(\)/i,
  /security definer/i,
  /set search_path\s*=\s*public, auth, pg_temp/i,
  /to_regclass\('public\.profiles'\)/i,
  /information_schema\.columns/i,
  /column_name\s*=\s*'user_id'/i,
  /column_name\s*=\s*'id'/i,
  /column_name\s*=\s*'full_name'/i,
  /column_name\s*=\s*'email'/i,
  /exception\s+when\s+others/i,
  /raise warning/i,
  /return new/i,
  /drop trigger if exists on_auth_user_created on auth\.users/i,
  /create trigger on_auth_user_created/i,
  /on conflict/i,
];
const forbiddenDestructive = [
  /drop\s+table/i,
  /delete\s+from\s+auth\.users/i,
  /truncate/i,
  /disable\s+trigger\s+all/i,
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
for (const pattern of required) check(pattern.test(sql), `repair SQL missing ${pattern}`);
for (const pattern of forbiddenDestructive) check(!pattern.test(sql), `repair SQL contains destructive operation ${pattern}`);
for (const pattern of secretPatterns) check(!pattern.test(sql), `repair SQL contains forbidden secret-like assignment ${pattern}`);
check(/if\s+to_regclass\('public\.profiles'\)\s+is\s+null/i.test(sql), "repair SQL must only install public.handle_new_user when public.profiles exists");
check(/drop trigger if exists on_auth_user_created on auth\.users;/.test(sql), "repair SQL must include the commented emergency trigger drop option");
console.log("Supabase auth DB repair SQL smoke passed");
