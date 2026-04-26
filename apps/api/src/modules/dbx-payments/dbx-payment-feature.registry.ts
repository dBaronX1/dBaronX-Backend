import { Injectable } from "@nestjs/common";
import { DBX_PAYMENT_CONSTANTS } from "./constants/dbx-payment.constants";

export type DbxPaymentFeatureFlag =
  | "dbx_payments_enabled"
  | "dbx_payment_workers_enabled"
  | "dbx_order_sync_enabled"
  | "dbx_risk_checks_enabled"
  | "dbx_notifications_enabled";

@Injectable()
export class DbxPaymentFeatureRegistry {
  isEnabled(flag: DbxPaymentFeatureFlag): boolean {
    const envKey = this.envKey(flag);
    const raw = String(process.env[envKey] || this.defaultFor(flag)).toLowerCase();
    return ["1", "true", "yes", "on"].includes(raw);
  }

  snapshot(): Record<DbxPaymentFeatureFlag, boolean> {
    return {
      dbx_payments_enabled: this.isEnabled("dbx_payments_enabled"),
      dbx_payment_workers_enabled: this.isEnabled("dbx_payment_workers_enabled"),
      dbx_order_sync_enabled: this.isEnabled("dbx_order_sync_enabled"),
      dbx_risk_checks_enabled: this.isEnabled("dbx_risk_checks_enabled"),
      dbx_notifications_enabled: this.isEnabled("dbx_notifications_enabled"),
    };
  }

  metadata() {
    return {
      provider: DBX_PAYMENT_CONSTANTS.PROVIDER,
      token: DBX_PAYMENT_CONSTANTS.TOKEN_SYMBOL,
      network: DBX_PAYMENT_CONSTANTS.NETWORK,
      mintAddress: DBX_PAYMENT_CONSTANTS.MINT_ADDRESS,
      decimals: DBX_PAYMENT_CONSTANTS.DECIMALS,
      features: this.snapshot(),
    };
  }

  private envKey(flag: DbxPaymentFeatureFlag): string {
    return flag.toUpperCase();
  }

  private defaultFor(flag: DbxPaymentFeatureFlag): string {
    switch (flag) {
      case "dbx_payments_enabled":
      case "dbx_order_sync_enabled":
      case "dbx_risk_checks_enabled":
      case "dbx_notifications_enabled":
        return "true";
      case "dbx_payment_workers_enabled":
        return "true";
      default:
        return "false";
    }
  }
}