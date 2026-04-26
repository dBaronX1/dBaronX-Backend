import { DbxProxyError } from "@/server/dbx/dbx-proxy.errors";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

export function assertDbxReference(value: unknown): string {
  const reference = String(value || "").trim();

  if (!reference || reference.length > 128 || !/^[A-Z0-9._:-]+$/i.test(reference)) {
    throw new DbxProxyError({
      status: 400,
      code: "INVALID_DBX_REFERENCE",
      message: "Invalid DBX payment reference.",
    });
  }

  return reference;
}

export function assertSolanaSignatureForProxy(value: unknown): string {
  const signature = String(value || "").trim();

  if (signature.length < 64 || signature.length > 128 || !BASE58.test(signature)) {
    throw new DbxProxyError({
      status: 400,
      code: "INVALID_SOLANA_SIGNATURE",
      message: "Enter a valid Solana transaction signature.",
    });
  }

  return signature;
}

export function assertDbxIntentPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const cartId = String(payload.cartId || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const customerName = String(payload.customerName || "").trim();
  const expectedUsdCents = Number(payload.expectedUsdCents);
  const expectedDbxBaseUnits = Number(payload.expectedDbxBaseUnits);

  if (!cartId || cartId.length > 128) {
    throw new DbxProxyError({
      status: 400,
      code: "INVALID_CART_ID",
      message: "Cart ID is required.",
    });
  }

  if (!email || !email.includes("@") || email.length > 254) {
    throw new DbxProxyError({
      status: 400,
      code: "INVALID_EMAIL",
      message: "Valid email is required.",
    });
  }

  if (!customerName || customerName.length > 96) {
    throw new DbxProxyError({
      status: 400,
      code: "INVALID_CUSTOMER_NAME",
      message: "Customer name is required.",
    });
  }

  if (!Number.isInteger(expectedUsdCents) || expectedUsdCents <= 0) {
    throw new DbxProxyError({
      status: 400,
      code: "INVALID_USD_AMOUNT",
      message: "Checkout amount is invalid.",
    });
  }

  if (!Number.isInteger(expectedDbxBaseUnits) || expectedDbxBaseUnits <= 0) {
    throw new DbxProxyError({
      status: 400,
      code: "INVALID_DBX_AMOUNT",
      message: "DBX amount is invalid.",
    });
  }

  return {
    ...payload,
    cartId,
    email,
    customerName,
    expectedUsdCents,
    expectedDbxBaseUnits,
  };
}