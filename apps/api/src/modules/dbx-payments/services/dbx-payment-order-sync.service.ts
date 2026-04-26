import { Injectable } from "@nestjs/common";
import { DbxMedusaCommerceAdapter } from "../dbx-medusa-commerce.adapter";
import type { DbxPaymentIntentRecord } from "../types/dbx-payment.types";

export type DbxPaymentOrderSyncDecision = {
  shouldSync: boolean;
  reason: string;
};

@Injectable()
export class DbxPaymentOrderSyncService {
  constructor(private readonly medusa: DbxMedusaCommerceAdapter) {}

  shouldSync(intent: DbxPaymentIntentRecord): DbxPaymentOrderSyncDecision {
    if (!intent.medusa_order_id) {
      return {
        shouldSync: false,
        reason: "no_medusa_order_id",
      };
    }

    if (!["verified", "verified_pending_order_sync"].includes(intent.status)) {
      return {
        shouldSync: false,
        reason: "intent_not_verified",
      };
    }

    return {
      shouldSync: true,
      reason: "sync_required",
    };
  }

  async sync(intent: DbxPaymentIntentRecord) {
    const decision = this.shouldSync(intent);

    if (!decision.shouldSync) {
      return {
        success: true,
        skipped: true,
        reason: decision.reason,
        medusaOrderId: intent.medusa_order_id || null,
      };
    }

    const result = await this.medusa.completeOrderForDbxPayment(intent);

    return {
      ...result,
      skipped: false,
      reason: decision.reason,
    };
  }
}