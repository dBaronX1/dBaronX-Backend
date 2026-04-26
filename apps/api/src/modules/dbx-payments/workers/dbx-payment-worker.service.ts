import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SchedulerService } from "../../../shared/services/scheduler.service";
import { DbxPaymentExpiryJob } from "../jobs/dbx-payment-expiry.job";
import { DbxPaymentOrderSyncJob } from "../jobs/dbx-payment-order-sync.job";

@Injectable()
export class DbxPaymentWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly expiryJobId = "dbx-payment-expiry";
  private readonly orderSyncJobId = "dbx-payment-order-sync";

  constructor(
    private readonly config: ConfigService,
    private readonly scheduler: SchedulerService,
    private readonly expiryJob: DbxPaymentExpiryJob,
    private readonly orderSyncJob: DbxPaymentOrderSyncJob,
  ) {}

  onModuleInit(): void {
    if (!this.enabled()) return;

    this.scheduler.every(
      this.expiryJobId,
      this.numberFromConfig("DBX_PAYMENT_EXPIRY_JOB_INTERVAL_MS", 60_000),
      async () => {
        await this.expiryJob.run(
          this.numberFromConfig("DBX_PAYMENT_EXPIRY_JOB_LIMIT", 100),
        );
      },
    );

    this.scheduler.every(
      this.orderSyncJobId,
      this.numberFromConfig("DBX_PAYMENT_ORDER_SYNC_JOB_INTERVAL_MS", 120_000),
      async () => {
        await this.orderSyncJob.run(
          this.numberFromConfig("DBX_PAYMENT_ORDER_SYNC_JOB_LIMIT", 50),
        );
      },
    );
  }

  onModuleDestroy(): void {
    this.scheduler.cancel(this.expiryJobId);
    this.scheduler.cancel(this.orderSyncJobId);
  }

  private enabled(): boolean {
    const raw = String(
      this.config.get<string>("DBX_PAYMENT_WORKERS_ENABLED") ||
        process.env.DBX_PAYMENT_WORKERS_ENABLED ||
        "true",
    ).toLowerCase();

    return ["1", "true", "yes", "on"].includes(raw);
  }

  private numberFromConfig(key: string, fallback: number): number {
    const value = Number(this.config.get<number>(key) || process.env[key] || fallback);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}