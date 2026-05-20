#!/usr/bin/env node

const API_BASE_URL = String(process.env.API_BASE_URL || "").trim().replace(/\/+$/, "");

const payload = {
  amount: 1999,
  priceMinor: 1999,
  currency: "usd",
  title: "Men's Cotton Linen Long Sleeve Casual Shirt",
  productName: "Men's Cotton Linen Long Sleeve Casual Shirt",
  productId: "mens-cotton-linen-long-sleeve-casual-shirt",
  handle: "mens-cotton-linen-long-sleeve-casual-shirt",
  checkoutRef: "dbx_test_first_sale",
  successUrl: "https://dbaronx.com/payment/success?checkout_ref=dbx_test_first_sale",
  cancelUrl: "https://dbaronx.com/payment/failed?checkout_ref=dbx_test_first_sale",
  supplier: "cj",
  supplierProductId: "2408300732091605000",
  supplierSku: "CJDS212420104DW",
  source: "dbaronx_first_sale",
  metadataSource: "dbaronx_first_sale",
};

const out = {
  success: false,
  status: null,
  routeReachable: false,
  responseOk: false,
  checkoutUrlPresent: false,
  checkoutUrlLooksStripe: false,
  sessionIdPresent: false,
  blockers: [],
  responseShapeKeys: [],
  likelyCause: null,
  nextManualStep: null,
};

if (!API_BASE_URL) {
  out.blockers.push("env_missing");
  out.likelyCause = "env_missing";
  out.nextManualStep = "Set API_BASE_URL, then rerun this script.";
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

const endpoint = `${API_BASE_URL}/api/checkout/stripe/session`;

try {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  out.status = res.status;
  out.routeReachable = res.status !== 404;
  out.responseOk = res.ok;

  const text = await res.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  out.responseShapeKeys = body && typeof body === "object" ? Object.keys(body) : [];
  const checkoutUrl = body?.checkoutUrl ?? body?.data?.checkoutUrl ?? null;
  const sessionId = body?.sessionId ?? body?.data?.sessionId ?? null;

  out.checkoutUrlPresent = typeof checkoutUrl === "string" && checkoutUrl.length > 0;
  out.checkoutUrlLooksStripe = out.checkoutUrlPresent && /^https:\/\/checkout\.stripe\.com\//.test(checkoutUrl);
  out.sessionIdPresent = typeof sessionId === "string" && sessionId.length > 0;

  if (res.status === 401 || res.status === 403) {
    out.blockers.push("auth_guard_blocking_public_checkout");
    out.likelyCause = "auth_guard_blocking_public_checkout";
    out.nextManualStep = "Confirm /api/checkout/stripe/session remains @Public and not behind internal/JWT guard.";
  } else if (res.status === 404) {
    out.blockers.push("route_missing_or_wrong_prefix");
    out.likelyCause = "route_missing_or_wrong_prefix";
    out.nextManualStep = "Verify API prefix/version and route registration for checkout/stripe/session.";
  } else if (res.status === 400) {
    out.blockers.push("dto_or_payload_rejected");
    out.likelyCause = "dto_or_payload_rejected";
    out.nextManualStep = "Inspect DTO validation errors and field mapping from frontend payload.";
  } else if (res.status >= 500) {
    out.blockers.push("backend_service_exception");
    out.likelyCause = "backend_service_exception";
    out.nextManualStep = "Inspect API logs for Stripe session creation exception details.";
  } else if (res.ok && !out.checkoutUrlPresent) {
    out.blockers.push("response_shape_missing_checkoutUrl");
    out.likelyCause = "response_shape_missing_checkoutUrl";
    out.nextManualStep = "Verify controller/service response shape includes checkoutUrl expected by Rocket.";
  } else if (res.ok && out.checkoutUrlPresent) {
    out.likelyCause = "none_detected";
    out.nextManualStep = "Open checkoutUrl in test mode and validate settlement-status flow after webhook.";
  } else {
    out.likelyCause = "unknown_non_ok_response";
    out.nextManualStep = "Inspect response payload and backend logs for rejection reason.";
  }

  out.success = Boolean(res.ok && out.checkoutUrlPresent && out.sessionIdPresent);
} catch {
  out.blockers.push("network_or_runtime_failure");
  out.likelyCause = "network_or_runtime_failure";
  out.nextManualStep = "Verify API_BASE_URL is reachable and backend is online.";
}

console.log(JSON.stringify(out, null, 2));
