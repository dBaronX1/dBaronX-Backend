import { readFileSync } from "node:fs";

const dtoPath = "apps/api/src/modules/payments/dto/create-stripe-checkout-session.dto.ts";
const servicePath = "apps/api/src/modules/payments/stripe-checkout.service.ts";

const dto = readFileSync(dtoPath, "utf8");
const service = readFileSync(servicePath, "utf8");

const properties = [
  "metadataSource",
  "supplier",
  "supplierProductId",
  "supplierSku",
  "handle",
];

for (const prop of properties) {
  const matches = dto.match(new RegExp(`\\b${prop}\\?:`, "g")) || [];
  if (matches.length !== 1) {
    throw new Error(`${dtoPath}: expected exactly 1 declaration for ${prop}, found ${matches.length}`);
  }
}

const requiredServiceChecks = [
  "const requestedSource = input.metadataSource || input.source;",
  'requestedSource === "dbaronx_first_sale" ? "dbaronx_first_sale" : "dbaronx"',
  "supplier: input.supplier || \"\"",
  "supplierProductId: input.supplierProductId || \"\"",
  "supplierSku: input.supplierSku || \"\"",
  "handle: input.handle || \"\"",
  "source: metadataSource",
];

for (const check of requiredServiceChecks) {
  if (!service.includes(check)) {
    throw new Error(`${servicePath}: missing required first-sale metadata mapping: ${check}`);
  }
}

const forbiddenStatePatterns = [
  /paymentMarkedPaid\s*:\s*true/g,
  /settlementStatus\s*:\s*["']medusa_order_completed["']/g,
];

for (const pattern of forbiddenStatePatterns) {
  if (pattern.test(service)) {
    throw new Error(`${servicePath}: detected hardcoded settlement/payment state: ${pattern}`);
  }
}

console.log("PASS: first-sale checkout DTO/service smoke checks");
