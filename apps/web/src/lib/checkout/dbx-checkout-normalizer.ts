import type {
  DbxCheckoutInput,
  DbxCheckoutValidationResult,
} from "@/types/dbx-checkout";
import type { CreateDbxPaymentIntentPayload } from "@/lib/api/nest/dbx-payments";

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanEmail(value: unknown): string {
  return cleanText(value).toLowerCase();
}

function isPositiveInteger(value: unknown): boolean {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

export function validateDbxCheckoutInput(
  input: DbxCheckoutInput,
): DbxCheckoutValidationResult {
  const errors: string[] = [];

  if (!cleanText(input.cart?.cartId)) {
    errors.push("Cart ID is required.");
  }

  if (!cleanEmail(input.customer?.email)) {
    errors.push("Customer email is required.");
  }

  if (!cleanText(input.customer?.customerName)) {
    errors.push("Customer name is required.");
  }

  if (!isPositiveInteger(input.cart?.expectedUsdCents)) {
    errors.push("Expected USD amount must be a positive integer in cents.");
  }

  if (!isPositiveInteger(input.cart?.expectedDbxBaseUnits)) {
    errors.push("Expected DBX amount must be a positive integer in base units.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildDbxPaymentIntentPayload(
  input: DbxCheckoutInput,
): CreateDbxPaymentIntentPayload {
  const validation = validateDbxCheckoutInput(input);

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return {
    cartId: cleanText(input.cart.cartId),
    medusaOrderId: cleanText(input.cart.medusaOrderId) || undefined,
    userId: cleanText(input.customer.userId) || undefined,
    email: cleanEmail(input.customer.email),
    customerName: cleanText(input.customer.customerName),
    expectedUsdCents: Number(input.cart.expectedUsdCents),
    expectedDbxBaseUnits: Number(input.cart.expectedDbxBaseUnits),
    senderWallet: cleanText(input.customer.senderWallet) || undefined,
    idempotencyKey:
      cleanText(input.idempotencyKey) ||
      `dbx:${cleanText(input.cart.cartId)}:${cleanEmail(input.customer.email)}`,
    metadata: {
      ...(input.metadata || {}),
      checkoutSource: input.metadata?.source || "rocket_web_checkout",
      ui: "dbx_checkout_bridge",
    },
  };
}
