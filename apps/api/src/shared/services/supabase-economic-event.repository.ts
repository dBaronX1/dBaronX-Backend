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
      .or(`idempotency_key.eq.${idempotencyKey},source_event_id.eq.${idempotencyKey}`)
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
        source: event.paymentRail,
        source_event_id: event.idempotencyKey,
        checkout_session_id: this.stringFromMetadata(event, "checkoutSessionId") || this.stringFromMetadata(event, "stripeSessionId") || null,
        cart_id: this.stringFromMetadata(event, "cartId") || null,
        order_ref: this.stringFromMetadata(event, "orderRef") || null,
        user_id: event.userId || this.stringFromMetadata(event, "userId") || null,
        product_id: this.stringFromMetadata(event, "productId") || null,
        variant_id: this.stringFromMetadata(event, "variantId") || null,
        verified: event.status === "verified" || event.status === "settled",
        payload: this.payloadFor(event),
        blockers: [],
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

  private stringFromMetadata(event: EconomicEvent, key: string): string {
    const value = event.metadata?.[key];
    return typeof value === "string" ? value.trim() : "";
  }

  private payloadFor(event: EconomicEvent): Record<string, unknown> {
    return {
      eventType: event.eventType,
      sourceModule: event.sourceModule,
      sourceRef: event.sourceRef,
      paymentRail: event.paymentRail,
      amount: event.amountMinorUnits,
      currency: event.currency,
      status: event.status,
      metadata: event.metadata || {},
    };
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
      sourceRef: String(row.reference_id || row.source_event_id || ""),
      userId: typeof metadata.userId === "string" ? metadata.userId : null,
      accountId:
        typeof metadata.accountId === "string" ? metadata.accountId : null,
      currency: String(row.currency || ""),
      amountMinorUnits: Number(row.amount || 0),
      assetType: String(
        metadata.assetType || "fiat",
      ) as EconomicEvent["assetType"],
      paymentRail: String(
        row.payment_rail || row.source || "",
      ) as EconomicEvent["paymentRail"],
      direction: String(row.direction || "") as EconomicEvent["direction"],
      status: String(row.status || "") as EconomicEvent["status"],
      idempotencyKey: String(row.idempotency_key || ""),
      metadata,
      createdAt: String(row.created_at || new Date().toISOString()),
    };
  }
}
