#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const scriptPath = 'scripts/e2e-medusa-database-contract-smoke.mjs';
const source = readFileSync(scriptPath, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(source.includes("import { createRequire } from 'node:module';") || source.includes('import { createRequire } from "node:module";'), 'Medusa DB smoke must use createRequire from node:module in ESM');
assert(source.includes('createRequire(import.meta.url)'), 'Medusa DB smoke must bind createRequire to import.meta.url');
assert(!/[^A-Za-z0-9_$]require\s*\(/.test(source), 'Medusa DB smoke must not call raw require() in ESM scope');
assert(!source.includes('require is not defined'), 'pg_client_unavailable diagnostics must not be caused by require being undefined');
assert(source.includes('medusaTableQueryRan: false'), 'Medusa DB smoke must expose that table queries have not run yet');
assert(source.includes('result.medusaTableQueryRan = true'), 'Medusa DB smoke must only flip medusaTableQueryRan after DB table query runs');
assert(/missingMedusaTables:\s*\[\]/.test(source), 'missing Medusa tables must start empty until the DB query runs');
assert(source.includes('REQUIRED_MEDUSA_TABLES.filter'), 'missing Medusa tables must only be populated from query results');
assert(!/console\.log\([^)]*databaseUrl/i.test(source), 'Medusa DB smoke must not print database URLs');
assert(!/host(name)?\s*[:=]/i.test(source), 'Medusa DB smoke must not print DB host diagnostics');
assert(!/username\s*[:=]|password\s*[:=]/i.test(source), 'Medusa DB smoke must not print DB username/password diagnostics');
assert(source.includes("'../apps/api/node_modules/pg'") || source.includes('"../apps/api/node_modules/pg"'), 'Medusa DB smoke must safely resolve pg from workspace dependencies');

console.log(JSON.stringify({ success: true, smoke: 'medusa-database-contract-smoke-loader', scriptPath }));
