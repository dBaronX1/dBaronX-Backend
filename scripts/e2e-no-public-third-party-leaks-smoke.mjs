import { read, listFiles, assert } from './e2e-production-lock-helpers.mjs';
const files = [
  ...listFiles('apps/web/src/app', (f) => /\.(tsx|ts)$/.test(f) && !f.includes('/(platform)/') && !f.includes('/api/')),
  ...listFiles('apps/web/src/components/dbx', (f) => /\.(tsx|ts)$/.test(f)),
];
const forbidden = [/CJ Dropshipping/i, /supplier=cj/i, /source=rocket_web/i, />\s*CJ\s*</i, /Rocket\.new/i, /Kickstarter/i, /Indiegogo/i, /Stripe error/i, /Paystack error/i, /Google provider errors/i, /\bRocket\b/, /\bMedusa\b/, /\bSupabase\b/, /\bFastAPI\b/, /\bNestJS\b/, /\bRender\b/, /\bGitHub\b/];
const leaks = [];
for (const file of files) {
  const text = read(file);
  for (const pattern of forbidden) if (pattern.test(text)) leaks.push(`${file}: ${pattern}`);
}
assert(leaks.length === 0, `customer UI third-party/source leaks:\n${leaks.join('\n')}`);
console.log('no public third-party leaks smoke passed');
