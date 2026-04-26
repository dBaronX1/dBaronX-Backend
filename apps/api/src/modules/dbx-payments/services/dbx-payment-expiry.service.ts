import { Injectable } from "@nestjs/common";
import { DateUtil } from "../../../shared/utils/date.util";
import { DbxPaymentStatePolicy } from "../policies/dbx-payment-state.policy";
import type { DbxPaymentIntentRecord } from "../types/dbx-payment.types";

@Injectable()
export class DbxPaymentExpiryService {
  constructor(private readonly statePolicy: DbxPaymentStatePolicy) {}

  buildExpiresAt(ttlMinutes: number): string {
    const safeMinutes = Math.min(Math.max(1, ttlMinutes), 1440);
    return DateUtil.addMinutes(new Date(), safeMinutes).toISOString();
  }

  isExpired(intent: Pick<DbxPaymentIntentRecord, "expires_at" | "status">): boolean {
    if (this.statePolicy.isTerminal(intent.status)) {
      return false;
    }

    return DateUtil.isExpired(intent.expires_at);
  }

  secondsUntilExpiry(intent: Pick<DbxPaymentIntentRecord, "expires_at">): number {
    const diff = DateUtil.diffSeconds(Date.now(), intent.expires_at);
    return Math.max(0, diff);
  }

  assertNotExpired(intent: DbxPaymentIntentRecord): void {
    if (!this.isExpired(intent)) return;

    const { DbxPaymentExpiredError } = require("../errors/dbx-payment.errors") as typeof import("../errors/dbx-payment.errors");
    throw new DbxPaymentExpiredError(intent.reference, intent.expires_at);
  }
}