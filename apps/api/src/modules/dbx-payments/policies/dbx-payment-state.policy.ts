import { Injectable } from "@nestjs/common";
import { DbxPaymentInvalidTransitionError } from "../errors/dbx-payment.errors";
import type { DbxPaymentStatus } from "../types/dbx-payment.types";

@Injectable()
export class DbxPaymentStatePolicy {
  private readonly transitions: Record<DbxPaymentStatus, DbxPaymentStatus[]> = {
    pending: ["submitted", "expired", "failed"],
    submitted: ["verified", "expired", "failed"],
    verified: ["completed", "verified_pending_order_sync"],
    verified_pending_order_sync: ["completed", "failed"],
    completed: [],
    expired: [],
    failed: [],
  };

  assertTransition(from: DbxPaymentStatus, to: DbxPaymentStatus): void {
    if (from === to) return;

    const allowed = this.transitions[from] || [];

    if (!allowed.includes(to)) {
      throw new DbxPaymentInvalidTransitionError(from, to);
    }
  }

  canTransition(from: DbxPaymentStatus, to: DbxPaymentStatus): boolean {
    if (from === to) return true;
    return (this.transitions[from] || []).includes(to);
  }

  isTerminal(status: DbxPaymentStatus): boolean {
    return ["completed", "expired", "failed"].includes(status);
  }

  isActive(status: DbxPaymentStatus): boolean {
    return !this.isTerminal(status);
  }

  isSubmittable(status: DbxPaymentStatus): boolean {
    return ["pending", "submitted"].includes(status);
  }

  isVerifiable(status: DbxPaymentStatus): boolean {
    return ["submitted"].includes(status);
  }

  isOrderSyncable(status: DbxPaymentStatus): boolean {
    return ["verified", "verified_pending_order_sync"].includes(status);
  }
}