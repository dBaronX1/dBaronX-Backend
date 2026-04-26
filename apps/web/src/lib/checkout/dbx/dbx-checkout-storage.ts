import type { DbxPaymentIntentResponse } from "@/lib/api/nest/dbx-payments";

const STORAGE_PREFIX = "dbx_checkout_intent";
const MAX_AGE_MS = 1000 * 60 * 60;

export interface StoredDbxCheckout {
  intent: DbxPaymentIntentResponse;
  storedAt: string;
}

function key(cartId: string): string {
  return `${STORAGE_PREFIX}:${cartId}`;
}

export function storeDbxCheckout(cartId: string, intent: DbxPaymentIntentResponse): void {
  if (typeof window === "undefined") return;

  const payload: StoredDbxCheckout = {
    intent,
    storedAt: new Date().toISOString(),
  };

  try {
    window.sessionStorage.setItem(key(cartId), JSON.stringify(payload));
  } catch {
    return;
  }
}

export function loadStoredDbxCheckout(cartId: string): StoredDbxCheckout | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(key(cartId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredDbxCheckout;

    if (!parsed.intent?.reference || !parsed.storedAt) {
      clearStoredDbxCheckout(cartId);
      return null;
    }

    const storedAt = new Date(parsed.storedAt).getTime();
    if (!Number.isFinite(storedAt) || Date.now() - storedAt > MAX_AGE_MS) {
      clearStoredDbxCheckout(cartId);
      return null;
    }

    if (["completed", "expired", "failed"].includes(parsed.intent.status)) {
      clearStoredDbxCheckout(cartId);
      return null;
    }

    return parsed;
  } catch {
    clearStoredDbxCheckout(cartId);
    return null;
  }
}

export function clearStoredDbxCheckout(cartId: string): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(key(cartId));
  } catch {
    return;
  }
}