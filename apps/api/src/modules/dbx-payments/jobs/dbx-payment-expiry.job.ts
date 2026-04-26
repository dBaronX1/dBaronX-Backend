import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../../../shared/database/supabase.service";
import { DbxPaymentRepository } from "../dbx-payment.repository";

@Injectable()
export class DbxPaymentExpiryJob {
  private readonly logger = new Logger(DbxPaymentExpiryJob.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly repository: DbxPaymentRepository,
  ) {}

  async run(limit = 100): Promise<{ expired: number }> {
    const { data, error } = await this.supabase.client
      .schema("app_public")
      .from("dbx_crypto_payment_intents")
      .select("*")
      .in("status", ["pending", "submitted"])
      .lte("expires_at", new Date().toISOString())
      .limit(limit);

    if (error) {
      this.logger.error(
        JSON.stringify({
          event: "dbx_expiry_job_query_failed",
          message: error.message,
          code: error.code,
        }),
      );

      return { expired: 0 };
    }

    let expired = 0;

    for (const intent of data || []) {
      try {
        await this.repository.transitionStatus(intent.id, "expired", {
          failure_reason: "Payment intent expired by scheduled job",
        });

        await this.repository.addEvent(intent.id, "intent_expired", {
          reference: intent.reference,
          source: "dbx_expiry_job",
          expiresAt: intent.expires_at,
        });

        expired += 1;
      } catch (error) {
        this.logger.error(
          JSON.stringify({
            event: "dbx_expiry_job_item_failed",
            reference: intent.reference,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }

    return { expired };
  }
}