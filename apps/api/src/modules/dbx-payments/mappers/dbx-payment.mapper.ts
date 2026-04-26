import { Injectable } from "@nestjs/common";
import { formatDbxAmountFromBaseUnits } from "../services/dbx-payment-pricing.service";
import type {
  DbxPaymentIntentRecord,
  DbxPaymentVerificationRecord,
} from "../types/dbx-payment.types";

export type DbxPaymentIntentView = {
  id: string;
  reference: string;
  status: string;
  cartId: string;
  medusaOrderId: string | null;
  expectedUsdCents: number;
  expectedDbxBaseUnits: string;
  expectedDbxDisplay: string;
  dbxMint: string;
  treasuryWallet: string;
  senderWallet: string | null;
  transactionSignature: string | null;
  expiresAt: string;
  verifiedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DbxPaymentVerificationView = {
  id: string;
  intentId: string;
  reference: string;
  transactionSignature: string;
  status: "passed" | "failed";
  reason: string | null;
  createdAt: string;
};

@Injectable()
export class DbxPaymentMapper {
  toIntentView(intent: DbxPaymentIntentRecord): DbxPaymentIntentView {
    return {
      id: intent.id,
      reference: intent.reference,
      status: intent.status,
      cartId: intent.cart_id,
      medusaOrderId: intent.medusa_order_id,
      expectedUsdCents: intent.expected_usd_cents,
      expectedDbxBaseUnits: String(intent.expected_dbx_base_units),
      expectedDbxDisplay: formatDbxAmountFromBaseUnits(
        String(intent.expected_dbx_base_units),
      ),
      dbxMint: intent.dbx_mint,
      treasuryWallet: intent.treasury_wallet,
      senderWallet: intent.sender_wallet,
      transactionSignature: intent.transaction_signature,
      expiresAt: intent.expires_at,
      verifiedAt: intent.verified_at,
      completedAt: intent.completed_at,
      failureReason: intent.failure_reason,
      createdAt: intent.created_at,
      updatedAt: intent.updated_at,
    };
  }

  toVerificationView(
    verification: DbxPaymentVerificationRecord,
  ): DbxPaymentVerificationView {
    return {
      id: verification.id,
      intentId: verification.intent_id,
      reference: verification.reference,
      transactionSignature: verification.transaction_signature,
      status: verification.status,
      reason: verification.reason,
      createdAt: verification.created_at,
    };
  }
}