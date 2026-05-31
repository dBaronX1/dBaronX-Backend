import { HttpStatus } from "@nestjs/common";

export type PublicCheckoutErrorCode =
  | "CHECKOUT_TEMPORARILY_UNAVAILABLE"
  | "PAYMENT_PROVIDER_NOT_CONFIGURED"
  | "INVALID_CART"
  | "INVALID_LINE_ITEM"
  | "SHIPPING_DETAILS_REQUIRED"
  | "PRODUCT_UNAVAILABLE"
  | "PRICE_VALIDATION_FAILED"
  | "PAYMENT_SESSION_FAILED"
  | "VALIDATION_FAILED";

export type PublicCheckoutError = {
  status: number;
  errorCode: PublicCheckoutErrorCode;
  message: string;
};

export const CHECKOUT_SAFE_MESSAGES: Record<PublicCheckoutErrorCode, string> = {
  CHECKOUT_TEMPORARILY_UNAVAILABLE: "Checkout is temporarily unavailable. Please try again.",
  PAYMENT_PROVIDER_NOT_CONFIGURED: "Payment provider is temporarily unavailable. Please try again.",
  INVALID_CART: "Some cart items are unavailable. Please update your cart and try again.",
  INVALID_LINE_ITEM: "Some cart items are unavailable. Please update your cart and try again.",
  SHIPPING_DETAILS_REQUIRED: "Please complete your shipping details before checkout.",
  PRODUCT_UNAVAILABLE: "Some cart items are unavailable. Please update your cart and try again.",
  PRICE_VALIDATION_FAILED: "Some cart items are unavailable. Please update your cart and try again.",
  PAYMENT_SESSION_FAILED: "Checkout is temporarily unavailable. Please try again.",
  VALIDATION_FAILED: "Some cart items are unavailable. Please update your cart and try again.",
};

export function publicCheckoutError(
  errorCode: PublicCheckoutErrorCode,
  status = HttpStatus.BAD_REQUEST,
): PublicCheckoutError {
  return { status, errorCode, message: CHECKOUT_SAFE_MESSAGES[errorCode] };
}

export function checkoutErrorResponse(error: PublicCheckoutError) {
  return { success: false, errorCode: error.errorCode, message: error.message };
}

export function mapCheckoutFailure(response: Record<string, unknown>, provider?: string): PublicCheckoutError {
  const blockers = Array.isArray(response.blockers) ? response.blockers.map(String) : [];
  const blocker = String(response.blocker || blockers[0] || "");
  const code = String(response.code || "");
  const configured = response.configured;

  if (configured === false || blocker.includes("not_configured") || blocker.includes("secret_key_missing")) {
    return publicCheckoutError("PAYMENT_PROVIDER_NOT_CONFIGURED", HttpStatus.SERVICE_UNAVAILABLE);
  }
  if (blocker.includes("missing_shipping") || code === "shipping_details_required") return publicCheckoutError("SHIPPING_DETAILS_REQUIRED", HttpStatus.BAD_REQUEST);
  if (blocker.includes("amount_mismatch") || blocker.includes("invalid_amount")) return publicCheckoutError("PRICE_VALIDATION_FAILED", HttpStatus.BAD_REQUEST);
  if (blocker.includes("invalid_quantity") || blocker.includes("missing_product") || code === "checkout_payload_invalid") {
    return publicCheckoutError("INVALID_LINE_ITEM", HttpStatus.BAD_REQUEST);
  }
  if (provider === "stripe" || provider === "paystack") return publicCheckoutError("PAYMENT_SESSION_FAILED", HttpStatus.SERVICE_UNAVAILABLE);
  return publicCheckoutError("CHECKOUT_TEMPORARILY_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE);
}
