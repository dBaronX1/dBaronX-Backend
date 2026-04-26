import { BadRequestException, Injectable } from "@nestjs/common";
import { DBX_PAYMENT_CONSTANTS } from "../constants/dbx-payment.constants";

export function formatDbxAmountFromBaseUnits(
  baseUnits: string | number,
  decimals = DBX_PAYMENT_CONSTANTS.DECIMALS,
): string {
  const raw = String(baseUnits || "0").replace(/[^\d]/g, "") || "0";
  const padded = raw.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

@Injectable()
export class DbxPaymentPricingService {
  assertAmounts(input: {
    expectedUsdCents: number;
    expectedDbxBaseUnits: number | string;
  }): {
    expectedUsdCents: number;
    expectedDbxBaseUnits: string;
    expectedDbxDisplay: string;
  } {
    const expectedUsdCents = Number(input.expectedUsdCents);
    const expectedDbxBaseUnits = String(input.expectedDbxBaseUnits);

    if (!Number.isInteger(expectedUsdCents) || expectedUsdCents <= 0) {
      throw new BadRequestException({
        code: "INVALID_DBX_PAYMENT_USD_AMOUNT",
        error: "BadRequest",
        message: "expectedUsdCents must be a positive integer",
      });
    }

    if (!/^\d+$/.test(expectedDbxBaseUnits) || BigInt(expectedDbxBaseUnits) <= BigInt(0)) {
      throw new BadRequestException({
        code: "INVALID_DBX_PAYMENT_TOKEN_AMOUNT",
        error: "BadRequest",
        message: "expectedDbxBaseUnits must be a positive integer string",
      });
    }

    return {
      expectedUsdCents,
      expectedDbxBaseUnits,
      expectedDbxDisplay: formatDbxAmountFromBaseUnits(expectedDbxBaseUnits),
    };
  }

  baseUnitsToDisplay(baseUnits: string | number): string {
    return formatDbxAmountFromBaseUnits(baseUnits);
  }

  compareBaseUnits(a: string | number, b: string | number): number {
    const left = BigInt(String(a || "0"));
    const right = BigInt(String(b || "0"));

    if (left > right) return 1;
    if (left < right) return -1;
    return 0;
  }
}