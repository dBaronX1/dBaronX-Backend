import { Injectable, Logger } from "@nestjs/common";
import { DbxPaymentRepository } from "../dbx-payment.repository";
import { DBX_PAYMENT_AUDIT_EVENTS } from "../constants/dbx-payment.constants";
import type {
  DbxPaymentEventType,
  DbxPaymentIntentRecord,
} from "../types/dbx-payment.types";
import { SecurityUtil } from "../../../shared/utils/security.util";

@Injectable()
export class DbxPaymentAuditService {
  private readonly logger = new Logger(DbxPaymentAuditService.name);

  constructor(private readonly repository: DbxPaymentRepository) {}

  async record(
    intent: Pick<DbxPaymentIntentRecord, "id" | "reference">,
    eventType: DbxPaymentEventType,
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    const sanitized = SecurityUtil.redactObject({
      ...payload,
      reference: intent.reference,
    });

    await this.repository.addEvent(intent.id, eventType, sanitized);

    this.logger.log(
      JSON.stringify({
        event: DBX_PAYMENT_AUDIT_EVENTS[eventTypeToAuditKey(eventType)] || eventType,
        intentId: intent.id,
        reference: intent.reference,
        payload: sanitized,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}

function eventTypeToAuditKey(eventType: DbxPaymentEventType): keyof typeof DBX_PAYMENT_AUDIT_EVENTS {
  switch (eventType) {
    case "intent_created":
      return "INTENT_CREATED";
    case "intent_submitted":
      return "INTENT_SUBMITTED";
    case "verification_requested":
      return "VERIFY_REQUESTED";
    case "verification_succeeded":
      return "VERIFY_SUCCEEDED";
    case "verification_failed":
      return "VERIFY_FAILED";
    case "order_sync_succeeded":
      return "ORDER_SYNC_SUCCEEDED";
    case "order_sync_failed":
      return "ORDER_SYNC_FAILED";
    case "intent_completed":
      return "INTENT_COMPLETED";
    case "intent_expired":
      return "INTENT_EXPIRED";
    case "intent_failed":
      return "INTENT_FAILED";
    default:
      return "INTENT_FAILED";
  }
}