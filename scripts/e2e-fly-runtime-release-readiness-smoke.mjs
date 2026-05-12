#!/usr/bin/env node

const FLY_APPS = {
  telegram: {
    appName: 'dbaronx-telegram-bot',
    knownFlyUrl: 'https://dbaronx-telegram-bot.fly.dev',
    envNames: ['BOT_BASE_URL', 'TELEGRAM_BOT_PUBLIC_BASE_URL'],
    buildOnlyMarkers: ['TELEGRAM_FLY_IMAGE_BUILT_ONLY', 'BOT_FLY_IMAGE_BUILT_ONLY', 'DBX_TELEGRAM_BUILD_ONLY_PUSHED'],
    healthPaths: ['/health'],
  },
  fastapi: {
    appName: 'dbaronx-fastapi',
    knownFlyUrl: 'https://dbaronx-fastapi.fly.dev',
    envNames: ['FASTAPI_BASE_URL'],
    buildOnlyMarkers: ['FASTAPI_FLY_IMAGE_BUILT_ONLY', 'DBX_FASTAPI_BUILD_ONLY_PUSHED'],
    healthPaths: ['/health'],
  },
  web: {
    appName: 'dbaronx-web',
    knownFlyUrl: 'https://dbaronx-web.fly.dev',
    envNames: ['WEB_BASE_URL'],
    buildOnlyMarkers: ['WEB_FLY_IMAGE_BUILT_ONLY', 'DBX_WEB_BUILD_ONLY_PUSHED'],
    healthPaths: ['/health', '/'],
  },
};

const timeoutMs = Number.parseInt(process.env.FLY_RUNTIME_SMOKE_TIMEOUT_MS || '12000', 10);
const blockers = [];
const checks = {};

const telegram = await checkRuntime('telegram', FLY_APPS.telegram);
const fastapi = await checkRuntime('fastapi', FLY_APPS.fastapi);
const web = await checkRuntime('web', FLY_APPS.web);

for (const [name, result] of Object.entries({ telegram, fastapi, web })) {
  checks[name] = result;
  if (result.status !== 'runtime_reachable') {
    addBlocker(`${name}_${result.status}`);
  }
}

const output = {
  success: blockers.length === 0,
  blockers,
  telegramFlyAppUrlConfigured: telegram.flyAppUrlConfigured,
  fastapiFlyAppUrlConfigured: fastapi.flyAppUrlConfigured,
  webFlyAppUrlConfigured: web.flyAppUrlConfigured,
  localEnv: {
    botBaseUrlConfigured: Boolean(pickEnv(FLY_APPS.telegram.envNames).value),
    botBaseUrlSource: pickEnv(FLY_APPS.telegram.envNames).name,
    fastapiBaseUrlConfigured: Boolean(pickEnv(FLY_APPS.fastapi.envNames).value),
    fastapiBaseUrlSource: pickEnv(FLY_APPS.fastapi.envNames).name,
    webBaseUrlConfigured: Boolean(pickEnv(FLY_APPS.web.envNames).value),
    webBaseUrlSource: pickEnv(FLY_APPS.web.envNames).name,
  },
  telegramRuntimeReady: telegram.status === 'runtime_reachable',
  fastapiRuntimeReady: fastapi.status === 'runtime_reachable',
  webRuntimeReady: web.status === 'runtime_reachable',
  runtimeStatuses: {
    telegram: telegram.status,
    fastapi: fastapi.status,
    web: web.status,
  },
  checks,
  nextManualStep: nextManualStep({ telegram, fastapi, web }),
};

console.log(JSON.stringify(output, null, 2));
process.exit(output.success ? 0 : 1);

async function checkRuntime(name, config) {
  const envPick = pickEnv(config.envNames);
  const url = normalizeBaseUrl(envPick.value);
  const buildOnlyMarked = config.buildOnlyMarkers.some((marker) => truthy(process.env[marker]));
  const base = url || config.knownFlyUrl;
  const result = {
    appName: config.appName,
    knownFlyUrl: config.knownFlyUrl,
    configuredBaseUrl: url || null,
    configuredBaseUrlSource: envPick.name,
    flyAppUrlConfigured: Boolean(config.knownFlyUrl),
    requiredLocalEnvConfigured: Boolean(url),
    status: 'release_status_unknown',
    statusReason: null,
    protectedEndpointCallsSkipped: true,
    probes: [],
  };

  if (buildOnlyMarked) {
    result.status = 'image_built_only';
    result.statusReason = `Local marker says an image was pushed without proving an actual Fly release for ${config.appName}.`;
    return result;
  }

  if (!url) {
    result.status = 'release_status_unknown';
    result.statusReason = `Set ${config.envNames.join(' or ')} to the released Fly URL before this smoke can prove ${config.appName} runtime readiness.`;
    return result;
  }

  for (const path of config.healthPaths) {
    const probe = await publicGet(`${base}${path}`, timeoutMs);
    result.probes.push({ path, ok: probe.ok, status: probe.status, error: probe.error });
    if (probe.ok) {
      result.status = 'runtime_reachable';
      result.statusReason = `${config.appName} responded on public ${path}.`;
      return result;
    }
  }

  result.status = 'runtime_unreachable';
  result.statusReason = `${config.appName} did not return a successful public health response. This smoke did not call protected endpoints or use tokens.`;
  return result;
}

async function publicGet(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: { accept: 'application/json,text/plain,*/*' },
    });
    return {
      ok: response.ok || (response.status >= 300 && response.status < 400),
      status: response.status,
      error: null,
    };
  } catch (error) {
    return { ok: false, status: 0, error: error?.name || 'fetch_failed' };
  } finally {
    clearTimeout(timer);
  }
}

function pickEnv(names) {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) return { name, value };
  }
  return { name: null, value: '' };
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function truthy(value) {
  return ['1', 'true', 'yes', 'built-only', 'image_built_only'].includes(String(value || '').trim().toLowerCase());
}

function addBlocker(blocker) {
  if (blocker && !blockers.includes(blocker)) blockers.push(blocker);
}

function nextManualStep(results) {
  const notReady = Object.entries(results).filter(([, result]) => result.status !== 'runtime_reachable');
  if (!notReady.length) {
    return 'Fly runtimes are publicly reachable. Continue with Medusa product readiness, Telegram customer journey, Stripe controlled transaction, and combined first-transaction smokes before opening checkout.';
  }
  const details = notReady.map(([name, result]) => `${name}: ${result.status}`).join(', ');
  if (notReady.some(([, result]) => result.status === 'image_built_only')) {
    return `A build-only image push is not a release (${details}). Run the actual deploy scripts, then rerun pnpm runtime:fly:readiness.`;
  }
  if (notReady.some(([, result]) => result.status === 'release_status_unknown')) {
    return `Release status is unknown (${details}). Set BOT_BASE_URL or TELEGRAM_BOT_PUBLIC_BASE_URL, FASTAPI_BASE_URL, and WEB_BASE_URL to the released Fly URLs, run actual deploy scripts if needed, then rerun.`;
  }
  return `Runtime unreachable (${details}). Check Fly release status/logs, ensure actual deploy completed, then rerun this smoke.`;
}
