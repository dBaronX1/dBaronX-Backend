import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "./supabase.service";
import {
  EconomicEventInput,
  EconomicEventPersistenceResult,
} from "../types/economic-event.types";

function isMissingPersistenceError(error: { code?: string; message?: string } | null | undefined): boolean {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return ["42P01", "PGRST205", "PGRST106"].includes(code) || message.includes("economic_events");
}

function isDuplicateError(error: { code?: string; message?: string } | null | undefined): boolean {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return code === "23505" || message.includes("duplicate key") || message.includes("unique");
}

@Injectable()
export class EconomicEventService {
  private readonly logger = new Logger(EconomicEventService.name);

  constructor(private readonly supabase: SupabaseService) {}

  validate(input: EconomicEventInput): void {
    const blockers: string[] = [];

    if (!input.eventType) blockers.push("economic_event_type_missing");
    if (!input.sourceModule) blockers.push("economic_event_source_module_missing");
    if (!input.paymentRail) blockers.push("economic_event_payment_rail_missing");
    if (!input.status) blockers.push("economic_event_status_missing");
    if (!input.direction) blockers.push("economic_event_direction_missing");
    if (!Number.isFinite(Number(input.amount)) || Number(input.amount) <= 0) blockers.push("economic_event_amount_invalid");
    if (!input.currency) blockers.push("economic_event_currency_missing");
    if (!input.referenceId) blockers.push("economic_event_reference_id_missing");
    if (!input.idempotencyKey) blockers.push("economic_event_idempotency_key_missing");
    if (!input.metadata?.verifierEvidence?.verifier) blockers.push("economic_event_verifier_missing");
    if (!input.metadata?.verifierEvidence?.reference) blockers.push("economic_event_verifier_reference_missing");
    if (!input.metadata?.verifierEvidence?.verifiedAt) blockers.push("economic_event_verified_at_missing");

    if (blockers.length > 0) {
      throw new BadRequestException({
        success: false,
        message: "Economic event validation failed",
        blockers,
      });
    }
  }

  async persist(input: EconomicEventInput): Promise<EconomicEventPersistenceResult> {
    this.validate(input);

    const row = {
      event_type: input.eventType,
      source_module: input.sourceModule,
      payment_rail: input.paymentRail,
      status: input.status,
      direction: input.direction,
      amount: input.amount,
      currency: input.currency.toLowerCase(),
      reference_id: input.referenceId,
      idempotency_key: input.idempotencyKey,
      metadata: input.metadata,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await this.supabase
        .getClient()
        .schema("app_public")
        .from("economic_events")
        .insert(row)
        .select("id")
        .single();

      if (error) {
        if (isDuplicateError(error)) {
          return {
            ready: true,
            persisted: true,
            duplicate: true,
            eventId: null,
            blockers: [],
          };
        }

        if (isMissingPersistenceError(error)) {
          return {
            ready: false,
            persisted: false,
            duplicate: false,
            eventId: null,
            blockers: ["economic_event_persistence_pending"],
          };
        }

        this.logger.warn(`economic_event_persist_failed code=${error.code || "unknown"} message=${error.message}`);
        return {
          ready: false,
          persisted: false,
          duplicate: false,
          eventId: null,
          blockers: ["economic_event_persistence_failed"],
        };
      }

      return {
        ready: true,
        persisted: true,
        duplicate: false,
        eventId: typeof data?.id === "string" ? data.id : null,
        blockers: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`economic_event_persist_exception ${message}`);
      return {
        ready: false,
        persisted: false,
        duplicate: false,
        eventId: null,
        blockers: ["economic_event_persistence_failed"],
      };
    }
  }
}
