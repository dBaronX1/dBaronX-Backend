import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { SupabaseService } from "../../../shared/database/supabase.service";
import { PaginationUtil } from "../../../shared/utils/pagination.util";
import { ListDbxPaymentIntentsDto } from "../dto/list-dbx-payment-intents.dto";
import type { DbxPaymentIntentRecord } from "../types/dbx-payment.types";

@Injectable()
export class DbxPaymentQueryService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(dto: ListDbxPaymentIntentsDto): Promise<{
    items: DbxPaymentIntentRecord[];
    total: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
  }> {
    const page = Math.max(1, Number(dto.page || 1));
    const limit = Math.min(100, Math.max(1, Number(dto.limit || 20)));
    const { from, to } = PaginationUtil.toRange(page, limit);

    let query = this.supabase.client
      .schema("app_public")
      .from("dbx_crypto_payment_intents")
      .select("*", { count: "exact" });

    if (dto.reference) query = query.eq("reference", dto.reference);
    if (dto.cartId) query = query.eq("cart_id", dto.cartId);
    if (dto.medusaOrderId) query = query.eq("medusa_order_id", dto.medusaOrderId);
    if (dto.email) query = query.ilike("email", `%${dto.email.toLowerCase()}%`);
    if (dto.status) query = query.eq("status", dto.status);
    if (dto.transactionSignature) query = query.eq("transaction_signature", dto.transactionSignature);

    const sortBy = dto.sortBy || "created_at";
    const sortDirection = dto.sortDirection || "desc";

    const { data, error, count } = await query
      .order(sortBy, { ascending: sortDirection === "asc" })
      .range(from, to);

    if (error) {
      throw new InternalServerErrorException({
        code: "DBX_PAYMENT_QUERY_FAILED",
        message: error.message,
      });
    }

    const total = count || 0;

    return {
      items: (data || []) as DbxPaymentIntentRecord[],
      total,
      page,
      limit,
      hasNextPage: page * limit < total,
    };
  }

  async findEvents(reference: string): Promise<Array<Record<string, unknown>>> {
    const { data: intent, error: intentError } = await this.supabase.client
      .schema("app_public")
      .from("dbx_crypto_payment_intents")
      .select("id")
      .eq("reference", reference)
      .maybeSingle();

    if (intentError) {
      throw new InternalServerErrorException({
        code: "DBX_PAYMENT_EVENT_INTENT_LOOKUP_FAILED",
        message: intentError.message,
      });
    }

    if (!intent?.id) return [];

    const { data, error } = await this.supabase.client
      .schema("app_public")
      .from("dbx_crypto_payment_events")
      .select("*")
      .eq("intent_id", intent.id)
      .order("created_at", { ascending: true });

    if (error) {
      throw new InternalServerErrorException({
        code: "DBX_PAYMENT_EVENTS_QUERY_FAILED",
        message: error.message,
      });
    }

    return data || [];
  }
}