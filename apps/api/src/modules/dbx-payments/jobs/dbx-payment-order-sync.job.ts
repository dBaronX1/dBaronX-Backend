import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../../../shared/database/supabase.service";
import { DbxPaymentRepository } from "../dbx-payment.repository";
import { DbxPaymentOrderSyncService } from "../services/dbx-payment-order-sync.service";

@Injectable()
export class DbxPaymentOrderSyncJob {
  private readonly logger = new Logger(DbxPaymentOrderSyncJob.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly repository: DbxPaymentRepository,
    private readonly orderSync: DbxPaymentOrderSyncService,
  ) {}

  async run(limit = 50): Promise<{ synced: number; failed: number }> {
    const { data, error } = await this.supabase.client
      .schema("app_public")
      .from("dbx_crypto_payment_intents")
      .select("*")
      .eq("status", "verified_pending_order_sync")
      .limit(limit);

    if (error) {
      this.logger.error(
        JSON.stringify({
          event: "dbx_order_sync_job_query_failed",
          message: error.message,
          code: error.code,
        }),
      );

      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    for (const intent of data || []) {
      try {
        const result = await this.orderSync.sync(intent);

        if (result.success) {
          await this.repository.transitionStatus(intent.id, "completed", {
            completed_at: new Date().toISOString(),
            failure_reason: null,
          });

          await this.repository.addEvent(intent.id, "order_sync_succeeded", {
            reference: intent.reference,
            source: "dbx_order_sync_job",
            skipped: result.skipped,
            reason: result.reason,
          });

          synced += 1;
        } else {
          failed += 1;
        }
      } catch (error) {
        failed += 1;

        await this.repository.addEvent(intent.id, "order_sync_failed", {
          reference: intent.reference,
          source: "dbx_order_sync_job",
          error: error instanceof Error ? error.message : String(error),
        });

        this.logger.error(
          JSON.stringify({
            event: "dbx_order_sync_job_item_failed",
            reference: intent.reference,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }

    return { synced, failed };
  }
}