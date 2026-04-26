import { Injectable } from "@nestjs/common";
import { SecurityUtil } from "../../../shared/utils/security.util";
import { StringUtil } from "../../../shared/utils/string.util";
import { DBX_PAYMENT_CONSTANTS } from "../constants/dbx-payment.constants";

@Injectable()
export class DbxPaymentIdempotencyService {
  fromExplicit(value?: string | null): string | null {
    const cleaned = String(value || "").trim();

    if (!cleaned) {
      return null;
    }

    return this.normalize(cleaned);
  }

  forCart(input: {
    cartId: string;
    email: string;
    expectedUsdCents: number;
    expectedDbxBaseUnits: string | number;
  }): string {
    const raw = [
      DBX_PAYMENT_CONSTANTS.IDEMPOTENCY_PREFIX,
      StringUtil.compact(input.cartId),
      StringUtil.normalizeEmail(input.email),
      String(input.expectedUsdCents),
      String(input.expectedDbxBaseUnits),
    ].join(":");

    return `${DBX_PAYMENT_CONSTANTS.IDEMPOTENCY_PREFIX}:${SecurityUtil.sha256(raw)}`;
  }

  forSignature(signature: string): string {
    return `${DBX_PAYMENT_CONSTANTS.IDEMPOTENCY_PREFIX}:sig:${SecurityUtil.sha256(signature)}`;
  }

  normalize(value: string): string {
    const compact = StringUtil.compact(value);

    if (compact.length <= 160 && /^[a-zA-Z0-9._:@/-]+$/.test(compact)) {
      return compact;
    }

    return `${DBX_PAYMENT_CONSTANTS.IDEMPOTENCY_PREFIX}:${SecurityUtil.sha256(compact)}`;
  }
}