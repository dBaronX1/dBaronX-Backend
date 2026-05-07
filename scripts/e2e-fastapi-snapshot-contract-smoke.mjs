#!/usr/bin/env node

const routes = [
  "/nestjs-handshake/snapshot",
  "/launch-control-manifest/snapshot",
  "/intelligence-startup-gate/snapshot",
  "/runtime-snapshot/snapshot",
  "/fastapi-step1-closure/snapshot",
];

const requiredEnvelopeKeys = [
  "success",
  "service",
  "status",
  "ready",
  "timestamp",
  "blockers",
  "capabilities",
];

const baseUrl = (process.env.FASTAPI_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const internalToken = process.env.INTERNAL_SERVICE_TOKEN || process.env.FASTAPI_INTERNAL_SERVICE_TOKEN || "";

function routeUrl(route) {
  return `${baseUrl}${route}`;
}

async function checkRoute(route) {
  const headers = {
    Accept: "application/json",
    "x-request-id": `fastapi-snapshot-contract-smoke-${Date.now()}`,
    "x-caller-service": "dbaronx-smoke",
    "x-caller-surface": "fastapi-snapshot-contract-smoke",
  };

  if (internalToken) {
    headers["x-internal-token"] = internalToken;
  }

  try {
    const response = await fetch(routeUrl(route), { method: "GET", headers });
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : { rawBody: await response.text() };

    const missingEnvelopeKeys = requiredEnvelopeKeys.filter((key) => !(key in body));
    const mounted = response.status !== 404 && missingEnvelopeKeys.length === 0;
    const degraded = mounted && (body.ready !== true || body.status === "degraded" || body.success !== true);

    return {
      route,
      statusCode: response.status,
      mounted,
      degraded,
      blockers: Array.isArray(body.blockers) ? body.blockers : [],
      missingEnvelopeKeys,
      service: body.service,
      status: body.status,
      ready: body.ready,
      success: body.success,
    };
  } catch (error) {
    return {
      route,
      statusCode: null,
      mounted: false,
      degraded: false,
      blockers: [`request_failed: ${error.name}`],
      missingEnvelopeKeys: requiredEnvelopeKeys,
      error: error.message,
    };
  }
}

const checkedRoutes = await Promise.all(routes.map(checkRoute));
const missingRoutes = checkedRoutes
  .filter((result) => !result.mounted)
  .map((result) => ({
    route: result.route,
    statusCode: result.statusCode,
    missingEnvelopeKeys: result.missingEnvelopeKeys,
    blockers: result.blockers,
    error: result.error,
  }));
const degradedRoutes = checkedRoutes
  .filter((result) => result.mounted && result.degraded)
  .map((result) => ({
    route: result.route,
    status: result.status,
    ready: result.ready,
    success: result.success,
    blockers: result.blockers,
  }));
const allRoutesMounted = missingRoutes.length === 0;
const blockers = [
  ...missingRoutes.map((result) => `missing_route:${result.route}`),
  ...degradedRoutes.flatMap((result) =>
    result.blockers.length > 0
      ? result.blockers.map((blocker) => `degraded_route:${result.route}:${blocker}`)
      : [`degraded_route:${result.route}`],
  ),
];

const report = {
  success: allRoutesMounted,
  blockers,
  checkedRoutes,
  missingRoutes,
  degradedRoutes,
  allRoutesMounted,
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = allRoutesMounted ? 0 : 1;
