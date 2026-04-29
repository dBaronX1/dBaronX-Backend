#!/usr/bin/env node

const checks = [
  { name: 'API health', env: 'API_BASE_URL', path: '/health' },
  { name: 'FastAPI health', env: 'FASTAPI_BASE_URL', path: '/health' },
  { name: 'FastAPI ready', env: 'FASTAPI_BASE_URL', path: '/ready' },
  { name: 'Medusa health', env: 'MEDUSA_BASE_URL', path: '/health' },
];

const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 8000);

function normalizeUrl(base, path) {
  const trimmed = base.replace(/\/+$/, '');
  return `${trimmed}${path}`;
}

async function checkService({ name, env, path }) {
  const base = process.env[env];
  if (!base) {
    return { name, ok: false, skipped: true, reason: `missing ${env}` };
  }

  const url = normalizeUrl(base, path);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    const bodyText = await res.text();
    return {
      name,
      ok: res.ok,
      status: res.status,
      url,
      bodySnippet: bodyText.slice(0, 180),
    };
  } catch (error) {
    return { name, ok: false, url, reason: error.message };
  } finally {
    clearTimeout(timer);
  }
}

(async () => {
  const results = await Promise.all(checks.map(checkService));
  let hasFailure = false;

  for (const result of results) {
    if (result.skipped) {
      console.warn(`⚠️  ${result.name}: skipped (${result.reason})`);
      hasFailure = true;
      continue;
    }

    if (result.ok) {
      console.log(`✅ ${result.name}: ${result.status} ${result.url}`);
      continue;
    }

    hasFailure = true;
    console.error(`❌ ${result.name}: ${result.status || 'ERR'} ${result.url}`);
    if (result.reason) {
      console.error(`   reason: ${result.reason}`);
    }
    if (result.bodySnippet) {
      console.error(`   body: ${result.bodySnippet}`);
    }
  }

  if (hasFailure) process.exit(1);
})();
