import { Injectable, Logger } from "@nestjs/common";
import type { DbxPaymentIntentRecord } from "../types/dbx-payment.types";
import { SecurityUtil } from "../../../shared/utils/security.util";

@Injectable()
export class DbxPaymentNotificationService {
  private readonly logger = new Logger(DbxPaymentNotificationService.name);

  async intentCreated(intent: DbxPaymentIntentRecord): Promise<void> {
    this.log("dbx.notification.intent_created", intent);
  }

  async paymentVerified(intent: DbxPaymentIntentRecord): Promise<void> {
    this.log("dbx.notification.payment_verified", intent);
  }

  async paymentCompleted(intent: DbxPaymentIntentRecord): Promise<void> {
    this.log("dbx.notification.payment_completed", intent);
  }

  async orderSyncPending(intent: DbxPaymentIntentRecord): Promise<void> {
    this.log("dbx.notification.order_sync_pending", intent);
  }

  async paymentFailed(intent: DbxPaymentIntentRecord): Promise<void> {
    this.log("dbx.notification.payment_failed", intent);
  }

  private log(event: string, intent: DbxPaymentIntentRecord): void {
    this.logger.log(
      JSON.stringify({
        event,
        reference: intent.reference,
        status: intent.status,
        email: SecurityUtil.maskEmail(intent.email),
        cartId: intent.cart_id,
        medusaOrderId: intent.medusa_order_id,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}