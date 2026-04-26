export interface DbxCheckoutCustomer {
  userId?: string;
  email: string;
  customerName: string;
  senderWallet?: string;
}

export interface DbxCheckoutCart {
  cartId: string;
  medusaOrderId?: string;
  expectedUsdCents: number;
  expectedDbxBaseUnits: number;
}

export interface DbxCheckoutMetadata {
  source?: string;
  campaign?: string;
  affiliateCode?: string;
  deviceClass?: "mobile" | "tablet" | "desktop" | "unknown";
  [key: string]: unknown;
}

export interface DbxCheckoutInput {
  customer: DbxCheckoutCustomer;
  cart: DbxCheckoutCart;
  metadata?: DbxCheckoutMetadata;
  idempotencyKey?: string;
}

export interface DbxCheckoutValidationResult {
  valid: boolean;
  errors: string[];
}
