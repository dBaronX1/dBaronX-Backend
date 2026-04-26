import { Injectable } from "@nestjs/common";
import { DbxPaymentRiskBlockedError } from "../errors/dbx-payment.errors";

export type DbxPaymentRiskInput = {
  userId?: string | null;
  email: string;
  cartId: string;
  expectedUsdCents: number;
  expectedDbxBaseUnits: string;
  senderWallet?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

export type DbxPaymentRiskDecision = {
  allowed: boolean;
  score: number;
  reasons: string[];
};

@Injectable()
export class DbxPaymentRiskService {
  evaluate(input: DbxPaymentRiskInput): DbxPaymentRiskDecision {
    const reasons: string[] = [];
    let score = 0;

    if (!input.email || !input.email.includes("@")) {
      score += 30;
      reasons.push("invalid_email");
    }

    if (!input.cartId) {
      score += 30;
      reasons.push("missing_cart_id");
    }

    if (input.expectedUsdCents <= 0) {
      score += 40;
      reasons.push("invalid_usd_amount");
    }

    if (!/^\d+$/.test(input.expectedDbxBaseUnits)) {
      score += 40;
      reasons.push("invalid_dbx_amount");
    }

    if (input.userAgent && /bot|crawler|headless|selenium|playwright/i.test(input.userAgent)) {
      score += 15;
      reasons.push("automated_user_agent");
    }

    const allowed = score < 70;

    return {
      allowed,
      score,
      reasons,
    };
  }

  assertAllowed(input: DbxPaymentRiskInput): DbxPaymentRiskDecision {
    const decision = this.evaluate(input);

    if (!decision.allowed) {
      throw new DbxPaymentRiskBlockedError(decision.reasons, decision.score);
    }

    return decision;
  }
}