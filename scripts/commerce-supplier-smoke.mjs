#!/usr/bin/env node
const API_URL = process.env.API_URL || "http://localhost:3001";
const TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "";
const headers = TOKEN ? {"x-internal-service-token": TOKEN, "content-type":"application/json"} : {"content-type":"application/json"};

const checks = [
  ["commerce-health", "GET", "/api/v1/commerce/health"],
  ["supplier-create-shape", "POST", "/api/v1/suppliers", { supplierId: "smoke-supplier", medusaOrderId: "smoke-order", lines: [{ supplierProductId: "smoke-product", quantity: 1 }] }],
  ["supplier-status-shape", "POST", "/api/v1/suppliers/orders/status", { supplierOrderId: "smoke-order-id", status: "accepted", note: "smoke" }],
  ["supplier-settle-shape", "POST", "/api/v1/suppliers/orders/settle", { supplierOrderId: "smoke-order-id", amount: 1, currency: "USD", metadata: { dryRun: true, noPayout: true } }],
];
for (const [name, method, path, body] of checks) {
  try {
    const r = await fetch(`${API_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    console.log(`${name}: ${r.status}`);
  } catch (e) { console.log(`${name}: ERROR ${e.message}`); process.exitCode = 1; }
}
