import fs from 'node:fs';

const API_BASE_URL = String(process.env.API_BASE_URL || '').trim();
const CHECKOUT_SESSION_ID = String(process.env.CHECKOUT_SESSION_ID || '').trim();
const CHECKOUT_REF = String(process.env.CHECKOUT_REF || '').trim();
const CUSTOMER_EMAIL = String(process.env.CUSTOMER_EMAIL || '').trim();

const result = {
  success: false,
  blockers: [],
  paymentStatusEndpointReachable: false,
  orderStatusEndpointReachable: false,
  paidOnlyWithProof: false,
  orderRecordFound: false,
  fulfillmentTaskFound: false,
  manualFulfillmentRequired: false,
  fakeFulfilledBlocked: true,
  trackingSafe: true,
  responseShape: {
    payment: null,
    order: null,
  },
  nextManualStep: 'manual_cj_placement_required',
};

function addBlocker(code) {
  if (!result.blockers.includes(code)) result.blockers.push(code);
}

async function getJson(path) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url);
  let json = null;
  try { json = await res.json(); } catch { json = null; }
  return { ok: res.ok, status: res.status, json, url };
}

function hasResponseShape(payload, kind) {
  if (!payload || typeof payload !== 'object') return false;
  const target = payload[kind];
  if (!target || typeof target !== 'object') return false;
  const required = ['payment_status', 'order_status', 'fulfillment_status'];
  return required.every((k) => Object.prototype.hasOwnProperty.call(target, k));
}

async function main() {
  if (!API_BASE_URL) {
    addBlocker('missing_api_base_url');
    addBlocker('missing_test_reference');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  if (!CHECKOUT_SESSION_ID && !CHECKOUT_REF) addBlocker('missing_test_reference');
  if (!CUSTOMER_EMAIL) addBlocker('missing_customer_email');

  const emailParam = CUSTOMER_EMAIL ? `&email=${encodeURIComponent(CUSTOMER_EMAIL)}` : '';
  const paymentPath = CHECKOUT_SESSION_ID
    ? `/payments/status?session_id=${encodeURIComponent(CHECKOUT_SESSION_ID)}${emailParam}`
    : `/payments/status?checkout_ref=${encodeURIComponent(CHECKOUT_REF)}${emailParam}`;

  const orderPath = CHECKOUT_REF
    ? `/orders/status?ref=${encodeURIComponent(CHECKOUT_REF)}${emailParam}`
    : '';

  const paymentRes = await getJson(paymentPath);
  result.paymentStatusEndpointReachable = paymentRes.status < 500;
  result.responseShape.payment = paymentRes.json;
  if (!result.paymentStatusEndpointReachable) addBlocker('payment_status_endpoint_unreachable');

  if (orderPath) {
    const orderRes = await getJson(orderPath);
    result.orderStatusEndpointReachable = orderRes.status < 500;
    result.responseShape.order = orderRes.json;
    if (!result.orderStatusEndpointReachable) addBlocker('order_status_endpoint_unreachable');

    const order = orderRes.json?.order;
    result.orderRecordFound = Boolean(order?.id);
    if (!result.orderRecordFound) addBlocker(orderRes.json?.blocker || 'order_record_not_found');
    if (order?.fulfillment_status === 'fulfilled' || order?.fulfillment_status === 'shipped' || order?.fulfillment_status === 'delivered') {
      result.fakeFulfilledBlocked = false;
      addBlocker('unexpected_customer_fulfillment_state');
    }
  }

  const payment = paymentRes.json?.payment;
  if (payment?.payment_status === 'paid_verified') result.paidOnlyWithProof = true;
  if (paymentRes.json?.blocker === 'email_required_for_unauthenticated_lookup') result.paidOnlyWithProof = true;

  if (payment?.fulfillment_status === 'manual_review_required') result.manualFulfillmentRequired = true;

  result.responseShape.payment = {
    url: paymentRes.url,
    ok: paymentRes.ok,
    shapeValid: hasResponseShape(paymentRes.json, 'payment'),
    payload: paymentRes.json,
  };
  if (orderPath) {
    const o = result.responseShape.order;
    result.responseShape.order = {
      shapeValid: hasResponseShape(o, 'order'),
      payload: o,
    };
  }

  result.fulfillmentTaskFound = result.manualFulfillmentRequired || Boolean(payment?.fulfillment_status);
  result.trackingSafe = payment?.fulfillment_status !== 'tracking_added' || Boolean(payment?.order_status);

  result.success = result.paymentStatusEndpointReachable && (!orderPath || result.orderStatusEndpointReachable) && result.blockers.filter((b) => b !== 'missing_customer_email' && b !== 'missing_test_reference').length === 0;

  console.log(JSON.stringify(result, null, 2));
}

await main();
