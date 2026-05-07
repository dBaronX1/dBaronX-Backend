#!/usr/bin/env node

const baseUrl = (process.env.FASTAPI_BASE_URL || process.env.FASTAPI_URL || 'http://localhost:8080').replace(/\/$/, '');

const routes = [
  '/health',
  '/nestjs-handshake/snapshot',
  '/launch-control-manifest/snapshot',
  '/intelligence-startup-gate/snapshot',
  '/runtime-snapshot/snapshot',
  '/fastapi-step1-closure/snapshot',
];

const requiredEnvelopeKeys = ['success', 'service', 'status', 'ready', 'timestamp', 'blockers', 'capabilities'];

async function getJson(path) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  let body = null;
  try {
    body = await response.json();
  } catch (error) {
    body = { parseError: error instanceof Error ? error.message : String(error) };
  }
  return { path, url, status: response.status, ok: response.ok, body };
}

function collectBlockers(result) {
  const blockers = result?.body?.blockers;
  return Array.isArray(blockers) ? blockers.map(String).filter(Boolean) : [];
}

function collectMissingDependencies(results) {
  const missing = new Set();
  for (const result of results) {
    for (const blocker of collectBlockers(result)) {
      if (/dependency|ModuleNotFoundError|missing/i.test(blocker)) {
        missing.add(`${result.path}:${blocker}`);
      }
    }
    const deps = result?.body?.runtime_snapshot?.dependencies || result?.body?.dependencies;
    const missingProviders = deps?.missing_required_provider_dependencies;
    if (Array.isArray(missingProviders)) {
      for (const provider of missingProviders) missing.add(`${result.path}:${provider}`);
    }
  }
  return [...missing].sort();
}

const results = [];
for (const route of routes) {
  try {
    results.push(await getJson(route));
  } catch (error) {
    results.push({
      path: route,
      url: `${baseUrl}${route}`,
      status: 0,
      ok: false,
      body: { error: error instanceof Error ? error.message : String(error) },
    });
  }
}

const snapshotResults = results.filter((result) => result.path !== '/health');
const allRoutesMounted = results.every((result) => result.status !== 404);
const allRoutesHttp200 = results.every((result) => result.status === 200);
const health = results.find((result) => result.path === '/health');
const healthReady = Boolean(health?.ok) && !['degraded', 'fail', 'failed', 'error'].includes(String(health?.body?.status || '').toLowerCase());
const degradedRoutes = snapshotResults
  .filter((result) => result.body?.ready !== true || collectBlockers(result).length > 0)
  .map((result) => ({ path: result.path, status: result.status, ready: result.body?.ready, blockers: collectBlockers(result) }));
const envelopeFailures = snapshotResults
  .filter((result) => !requiredEnvelopeKeys.every((key) => Object.prototype.hasOwnProperty.call(result.body || {}, key)))
  .map((result) => result.path);
const blockers = results.flatMap((result) => collectBlockers(result).map((blocker) => `${result.path}:${blocker}`));
const missingDependencies = collectMissingDependencies(results);
const readinessGreen = healthReady && allRoutesMounted && allRoutesHttp200 && degradedRoutes.length === 0 && envelopeFailures.length === 0;

const summary = {
  success: readinessGreen,
  blockers,
  healthReady,
  allRoutesMounted,
  allRoutesHttp200,
  readinessGreen,
  missingDependencies,
  degradedRoutes,
  envelopeFailures,
  baseUrl,
};

console.log(JSON.stringify(summary, null, 2));
process.exit(readinessGreen ? 0 : 1);
