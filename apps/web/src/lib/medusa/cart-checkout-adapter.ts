export async function createMedusaCart() { return { configured: false, message: "checkout is handled by NestJS API" }; }
export async function addItemToMedusaCart() { return { configured: false, message: "checkout is handled by NestJS API" }; }
export function buildCheckoutSessionHandoff(cartId: string) { return { cartId, status: "requires_nest_checkout_session" as const, message: "checkout is handled by NestJS API" }; }
export function buildNestPaymentIntentHandoff(cartId: string) { return { cartId, endpoint: "/api/checkout/dbx/intent", status: "requires_nest_payment_provider" as const }; }
