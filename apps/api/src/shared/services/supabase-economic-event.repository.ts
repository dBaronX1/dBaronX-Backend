import { Injectable } from "@nestjs/common";
import {
  EconomicEvent,
  EconomicEventRepository,
} from "../types/economic-event.types";
import { SupabaseService } from "./supabase.service";

@Injectable()
export class SupabaseEconomicEventRepository implements EconomicEventRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<EconomicEvent | null> {
    const { data, error } = await this.supabase
      .getClient()
      .schema("app_public")
      .from("economic_events")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (error) throw error;
    return data ? this.toEconomicEvent(data as Record<string, unknown>) : null;
  }

  async append(event: EconomicEvent): Promise<EconomicEvent> {
    const { data, error } = await this.supabase
      .getClient()
      .schema("app_public")
      .from("economic_events")
      .insert({
        event_type: event.eventType,
        source_module: event.sourceModule,
        payment_rail: event.paymentRail,
        status: event.status,
        direction: event.direction,
        amount: event.amountMinorUnits,
        currency: event.currency,
        reference_id: event.sourceRef,
        idempotency_key: event.idempotencyKey,
        metadata: {
          ...(event.metadata || {}),
          economicEventId: event.eventId,
          assetType: event.assetType,
          userId: event.userId || null,
          accountId: event.accountId || null,
        },
        created_at: event.createdAt,
      })
      .select("*")
      .single();

    if (error) throw error;
    return this.toEconomicEvent(data as Record<string, unknown>);
  }

  private toEconomicEvent(row: Record<string, unknown>): EconomicEvent {
    const metadata = (
      row.metadata && typeof row.metadata === "object" ? row.metadata : {}
    ) as Record<string, unknown>;
    return {
      eventId: String(metadata.economicEventId || row.id || ""),
      eventType: String(row.event_type || "") as EconomicEvent["eventType"],
      sourceModule: String(
        row.source_module || "",
      ) as EconomicEvent["sourceModule"],
      sourceRef: String(row.reference_id || ""),
      userId: typeof metadata.userId === "string" ? metadata.userId : null,
      accountId:
        typeof metadata.accountId === "string" ? metadata.accountId : null,
      currency: String(row.currency || ""),
      amountMinorUnits: Number(row.amount || 0),
      assetType: String(
        metadata.assetType || "fiat",
      ) as EconomicEvent["assetType"],
      paymentRail: String(
        row.payment_rail || "",
      ) as EconomicEvent["paymentRail"],
      direction: String(row.direction || "") as EconomicEvent["direction"],
      status: String(row.status || "") as EconomicEvent["status"],
      idempotencyKey: String(row.idempotency_key || ""),
      metadata,
      createdAt: String(row.created_at || new Date().toISOString()),
    };
  }
}
