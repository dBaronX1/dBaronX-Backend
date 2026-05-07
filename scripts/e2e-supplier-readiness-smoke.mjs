#!/usr/bin/env node

const API_URL = (process.env.API_URL || "http://localhost:3001").replace(/\/$/, "");

function unwrap(payload) {
  return payload && typeof payload === "object" && payload.data && typeof payload.data === "object" ? payload.data : payload;
}

async function main() {
  const response = await fetch(`${API_URL}/api/suppliers/readiness`, {
    headers: { accept: "application/json" },
  });
  const payload = unwrap(await response.json().catch(() => ({})));
  const output = {
    success: response.ok && payload.success === true,
    httpStatus: response.status,
    blockers: payload.blockers || [],
    warnings: payload.warnings || [],
    cjConfigured: Boolean(payload.cjConfigured),
    cjLiveProbeAttempted: Boolean(payload.cjLiveProbeAttempted),
    cjLiveProbeOk: Boolean(payload.cjLiveProbeOk),
  };

  console.log(JSON.stringify(output, null, 2));
  if (!response.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
