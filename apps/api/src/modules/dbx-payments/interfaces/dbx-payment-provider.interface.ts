import type {
  DbxChainVerificationRequest,
  DbxChainVerificationResponse,
  DbxPaymentIntentRecord,
} from "../types/dbx-payment.types";

export interface DbxPaymentChainVerifier {
  verify(payload: DbxChainVerificationRequest): Promise<DbxChainVerificationResponse>;
}

export interface DbxPaymentCommerceSyncProvider {
  completeOrderForDbxPayment(intent: DbxPaymentIntentRecord): Promise<{
    success: boolean;
    medusaOrderId?: string | null;
    message?: string;
    raw?: unknown;
  }>;
}

export interface DbxPaymentNotificationProvider {
  intentCreated(intent: DbxPaymentIntentRecord): Promise<void>;
  paymentVerified(intent: DbxPaymentIntentRecord): Promise<void>;
  paymentCompleted(intent: DbxPaymentIntentRecord): Promise<void>;
  orderSyncPending(intent: DbxPaymentIntentRecord): Promise<void>;
  paymentFailed(intent: DbxPaymentIntentRecord): Promise<void>;
}

export const DBX_CHAIN_VERIFIER = Symbol("DBX_CHAIN_VERIFIER");
export const DBX_COMMERCE_SYNC_PROVIDER = Symbol("DBX_COMMERCE_SYNC_PROVIDER");
export const DBX_NOTIFICATION_PROVIDER = Symbol("DBX_NOTIFICATION_PROVIDER");