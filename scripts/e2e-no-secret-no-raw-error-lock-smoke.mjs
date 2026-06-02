import { read, listFiles, assert } from './e2e-production-lock-helpers.mjs';
const files = listFiles('apps/web/src', (f) => /\.(tsx|ts)$/.test(f) && !f.includes('/(platform)/'));
const raw = [/auth_service_unavailable/i,/checkout_api_unavailable/i,/supabase_error/i,/database_error/i,/internal_service_error/i,/service_role_missing/i,/jwt_error/i,/failed_to_fetch/i,/TypeError/,/NetworkError/,/raw JSON/i,/stack trace/i,/STRIPE_SECRET_KEY=.*[A-Za-z0-9]/,/PAYSTACK_SECRET_KEY=.*[A-Za-z0-9]/,/SUPABASE_SERVICE_ROLE_KEY=.*[A-Za-z0-9]/,/DATABASE_URL=.*[A-Za-z0-9]/,/OPENAI_API_KEY=.*[A-Za-z0-9]/,/ANTHROPIC_API_KEY=.*[A-Za-z0-9]/,/GEMINI_API_KEY=.*[A-Za-z0-9]/];
const leaks = [];
for (const file of files) {
  if (file.endsWith('nest-auth-client.ts')) continue;
  const text = read(file);
  for (const pattern of raw) if (pattern.test(text)) leaks.push(`${file}: ${pattern}`);
}
const mapper = read('apps/web/src/lib/auth/nest-auth-client.ts');
assert(mapper.includes('RAW_BACKEND_ERROR_PATTERN') && mapper.includes('safeAuthMessage'), 'frontend safe auth mapper missing');
assert(leaks.length === 0, `raw error/secret leaks in customer UI:\n${leaks.join('\n')}`);
console.log('no secret/no raw error lock smoke passed');
