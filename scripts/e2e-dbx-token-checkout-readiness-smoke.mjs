#!/usr/bin/env node

const API_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const DBX_PAYMENT_ADDRESS = (process.env.NEXT_PUBLIC_DBX_SOLANA_PAYMENT_ADDRESS || "").trim();
const SOLANA_RPC_URL = (process.env.SOLANA_RPC_URL || process.env.DBX_SOLANA_RPC_URL || "").trim();
const HEALTH_PATHS = ["/api/health", "/health", "/api/system/runtime-status"];
const FAKE_SIGNATURE = "1".repeat(88);
const INVALID_SIGNATURE = "not-a-solana-signature";

const result = {
  success: false,
  blockers: [],
  apiReady: false,
  dbxIntentReady: false,
  dbxSubmitReady: false,
  dbxConfirmReady: false,
  fakeTxRejected: false,
  paymentMarkedPaid: false,
  orderSyncReady: false,
  dbxPaymentAddressPresent: DBX_PAYMENT_ADDRESS.length > 0,
  solanaRpcConfigured: SOLANA_RPC_URL.length > 0,
  nextManualStep: "Configure SOLANA_RPC_URL and submit a real finalized DBX SPL-token transfer signature for end-to-end order sync validation.",
  http: {},
};

function endpoint(path) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return { text: "", body: null };
  try {
    return { text, body: JSON.parse(text) };
  } catch {
    return { text, body: { raw: text } };
  }
}

async function fetchJson(path, options = {}) {
  const response = await fetch(endpoint(path), {
    method: options.method || "GET",
    headers: {
      "content-type": "application/json",
      "x-request-id": `dbx-checkout-smoke-${Date.now()}`,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  }).catch((error) => ({ networkError: error }));

  if (response.networkError) {
    return {
      ok: false,
      status: 0,
      body: { message: response.networkError instanceof Error ? response.networkError.message : String(response.networkError) },
      text: "",
    };
  }

  const { body, text } = await readJson(response);
  return { ok: response.ok, status: response.status, body, text };
}

function dataOf(payload) {
  return payload?.data || payload || {};
}

function addBlocker(blocker) {
  if (blocker && !result.blockers.includes(blocker)) result.blockers.push(blocker);
}

async function probeHealth() {
  for (const path of HEALTH_PATHS) {
    const probe = await fetchJson(path);
    result.http[path] = probe.status;
    if (probe.ok && (probe.body?.success === true || probe.body?.status === "ok" || probe.body?.status === "healthy")) {
      result.apiReady = true;
      return;
    }
  }
  addBlocker("api_health_not_ready");
}

async function main() {
  await probeHealth();

  if (!result.dbxPaymentAddressPresent) addBlocker("dbx_payment_address_not_configured");
  if (!result.solanaRpcConfigured) addBlocker("solana_rpc_not_configured");

  const idempotencyKey = `dbx-smoke-${Date.now()}`;
  const intent = await fetchJson("/api/dbx-payments/intents", {
    method: "POST",
    body: {
      cartId: `cart_dbx_smoke_${Date.now()}`,
      email: "checkout-smoke@dbaronx.local",
      customerName: "DBX Checkout Smoke",
      expectedUsdCents: 100,
      currency: "USD",
      expectedDbxBaseUnits: "1000000000",
      idempotencyKey,
      metadata: { smoke: true },
    },
  });
  result.http["POST /api/dbx-payments/intents"] = intent.status;
  const intentData = dataOf(intent.body);
  result.dbxIntentReady = Boolean(
    intent.ok &&
    intentData.status === "pending" &&
    intentData.reference &&
    intentData.expiresAt &&
    (intentData.dbxPaymentAddress || intentData.treasuryWallet)
  );
  result.paymentMarkedPaid = result.paymentMarkedPaid || intentData.paymentMarkedPaid === true || ["verified", "completed"].includes(intentData.status);

  if (!result.dbxIntentReady) {
    addBlocker(`dbx_intent_not_ready_${intent.status}`);
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const invalidSubmit = await fetchJson("/api/dbx-payments/submit", {
    method: "POST",
    body: {
      intentReference: intentData.reference,
      transactionSignature: INVALID_SIGNATURE,
    },
  });
  result.http["POST /api/dbx-payments/submit invalid"] = invalidSubmit.status;
  result.fakeTxRejected = !invalidSubmit.ok;

  const submit = await fetchJson("/api/dbx-payments/submit", {
    method: "POST",
    body: {
      intentReference: intentData.reference,
      txHash: FAKE_SIGNATURE,
    },
  });
  result.http["POST /api/dbx-payments/submit fake"] = submit.status;
  const submitData = dataOf(submit.body);
  result.dbxSubmitReady = Boolean(submit.ok && submitData.status === "submitted" && submitData.verificationStatus === "verification_pending");
  result.paymentMarkedPaid = result.paymentMarkedPaid || submitData.paymentMarkedPaid === true || ["verified", "completed"].includes(submitData.status);

  const confirm = await fetchJson("/api/dbx-payments/confirm", {
    method: "POST",
    body: {
      intentReference: intentData.reference,
      transactionSignature: FAKE_SIGNATURE,
    },
  });
  result.http["POST /api/dbx-payments/confirm fake"] = confirm.status;
  const confirmData = dataOf(confirm.body);
  result.dbxConfirmReady = Boolean(confirm.ok && ["failed", "submitted"].includes(confirmData.status));
  result.fakeTxRejected = result.fakeTxRejected && !["verified", "completed"].includes(confirmData.status);
  result.paymentMarkedPaid = result.paymentMarkedPaid || confirmData.paymentMarkedPaid === true || ["verified", "completed"].includes(confirmData.status);
  result.orderSyncReady = confirmData.orderSyncReady === true;

  if (!result.dbxSubmitReady) addBlocker(`dbx_submit_not_ready_${submit.status}`);
  if (!result.dbxConfirmReady) addBlocker(`dbx_confirm_not_ready_${confirm.status}`);
  if (!result.fakeTxRejected) addBlocker("fake_tx_not_rejected");
  if (result.paymentMarkedPaid) addBlocker("fake_payment_marked_paid");
  if (!result.orderSyncReady) addBlocker("payment_confirmed_order_sync_pending");

  result.success = result.apiReady && result.dbxIntentReady && result.dbxSubmitReady && result.dbxConfirmReady && result.fakeTxRejected && !result.paymentMarkedPaid && result.blockers.length === 0;
  result.nextManualStep = result.blockers.length
    ? `Resolve blockers: ${result.blockers.join(", ")}. Then rerun this smoke with a real DBX transfer signature.`
    : "Run a real-wallet DBX SPL-token checkout against a Medusa order and confirm durable order sync.";

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}

main().catch((error) => {
  addBlocker("dbx_smoke_exception");
  result.http.exception = error instanceof Error ? error.message : String(error);
  console.log(JSON.stringify(result, null, 2));
  process.exit(1);
});
