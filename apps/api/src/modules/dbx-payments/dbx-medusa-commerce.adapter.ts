import {
  BadGatewayException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DbxPaymentIntentRecord } from "./types/dbx-payment.types";

type MedusaSyncResult = {
  success: boolean;
  medusaOrderId?: string | null;
  message?: string;
  raw?: unknown;
};

@Injectable()
export class DbxMedusaCommerceAdapter {
  private readonly logger = new Logger(DbxMedusaCommerceAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async completeOrderForDbxPayment(
    intent: DbxPaymentIntentRecord,
  ): Promise<MedusaSyncResult> {
    if (!intent.medusa_order_id) {
      return {
        success: true,
        medusaOrderId: null,
        message: "No Medusa order id attached; DBX payment completed without commerce sync.",
      };
    }

    const baseUrl = this.getMedusaBaseUrl();
    const apiKey = this.getMedusaAdminApiKey();

    if (!baseUrl || !apiKey) {
      throw new BadGatewayException({
        code: "MEDUSA_SYNC_NOT_CONFIGURED",
        message: "Medusa sync is not configured.",
      });
    }

    const endpoint = `${baseUrl}/admin/orders/${encodeURIComponent(
      intent.medusa_order_id,
    )}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        "x-dbx-payment-reference": intent.reference,
      },
      body: JSON.stringify({
        metadata: {
          ...(intent.metadata || {}),
          dbxPaymentReference: intent.reference,
          dbxTransactionSignature: intent.transaction_signature,
          dbxPaidAt: intent.verified_at,
          paymentProvider: "dbx_solana",
          paymentStatus: "captured",
        },
      }),
    }).catch((error) => {
      this.logger.error(
        JSON.stringify({
          event: "dbx_medusa_sync_network_error",
          reference: intent.reference,
          medusaOrderId: intent.medusa_order_id,
          error: error instanceof Error ? error.message : String(error),
        }),
      );

      throw new BadGatewayException({
        code: "MEDUSA_SYNC_NETWORK_ERROR",
        message: "Could not reach Medusa while completing DBX payment.",
      });
    });

    const raw = await response.json().catch(() => null);

    if (!response.ok) {
      this.logger.error(
        JSON.stringify({
          event: "dbx_medusa_sync_failed",
          reference: intent.reference,
          medusaOrderId: intent.medusa_order_id,
          statusCode: response.status,
          raw,
        }),
      );

      throw new BadGatewayException({
        code: "MEDUSA_SYNC_FAILED",
        message: "Medusa order sync failed.",
        details: raw,
      });
    }

    return {
      success: true,
      medusaOrderId: intent.medusa_order_id,
      raw,
    };
  }

  private getMedusaBaseUrl(): string {
    return String(this.config.get<string>("MEDUSA_BASE_URL") || "")
      .trim()
      .replace(/\/+$/, "");
  }

  private getMedusaAdminApiKey(): string {
    return String(this.config.get<string>("MEDUSA_ADMIN_API_KEY") || "").trim();
  }
}
