export type DbxCheckoutEventName =
  | "dbx_checkout_intent_created"
  | "dbx_checkout_restored"
  | "dbx_checkout_verified"
  | "dbx_checkout_completed"
  | "dbx_checkout_failed"
  | "dbx_checkout_modal_opened"
  | "dbx_checkout_modal_closed";

export interface DbxCheckoutEventPayload {
  reference?: string;
  cartId?: string;
  status?: string;
  error?: string;
  [key: string]: unknown;
}

export function emitDbxCheckoutEvent(
  name: DbxCheckoutEventName,
  payload: DbxCheckoutEventPayload = {},
): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(name, {
      detail: {
        ...payload,
        emittedAt: new Date().toISOString(),
      },
    }),
  );

  const analytics = (window as unknown as {
    dataLayer?: Array<Record<string, unknown>>;
  }).dataLayer;

  if (Array.isArray(analytics)) {
    analytics.push({
      event: name,
      ...payload,
    });
  }
}