import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { SupabaseService } from "../../shared/database/supabase.service";
import {
  DbxPaymentEventType,
  DbxPaymentIntentRecord,
  DbxPaymentStatus,
  DbxPaymentVerificationRecord,
} from "./types/dbx-payment.types";

@Injectable()
export class DbxPaymentRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async createIntent(input: {
    reference: string;
    userId?: string | null;
    email: string;
    customerName: string;
    cartId: string;
    medusaOrderId?: string | null;
    expectedUsdCents: number;
    expectedDbxBaseUnits: string;
    dbxMint: string;
    treasuryWallet: string;
    senderWallet?: string | null;
    expiresAt: string;
    idempotencyKey?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<DbxPaymentIntentRecord> {
    if (input.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(input.idempotencyKey);
      if (existing) return existing;
    }

    const { data, error } = await this.supabase.client
      .schema("app_public")
      .from("dbx_crypto_payment_intents")
      .insert({
        reference: input.reference,
        user_id: input.userId || null,
        email: input.email,
        customer_name: input.customerName,
        cart_id: input.cartId,
        medusa_order_id: input.medusaOrderId || null,
        expected_usd_cents: input.expectedUsdCents,
        expected_dbx_base_units: input.expectedDbxBaseUnits,
        dbx_mint: input.dbxMint,
        treasury_wallet: input.treasuryWallet,
        sender_wallet: input.senderWallet || null,
        status: "pending",
        expires_at: input.expiresAt,
        idempotency_key: input.idempotencyKey || null,
        metadata: input.metadata || {},
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new ConflictException("DBX payment intent already exists");
      }

      throw new InternalServerErrorException({
        code: "DBX_INTENT_CREATE_FAILED",
        message: error.message,
      });
    }

    const intent = data as DbxPaymentIntentRecord;
    await this.addEvent(intent.id, "intent_created", {
      reference: intent.reference,
      cartId: intent.cart_id,
    });

    return intent;
  }

  async findByReference(reference: string): Promise<DbxPaymentIntentRecord | null> {
    const { data, error } = await this.supabase.client
      .schema("app_public")
      .from("dbx_crypto_payment_intents")
      .select("*")
      .eq("reference", reference)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException({
        code: "DBX_INTENT_LOOKUP_FAILED",
        message: error.message,
      });
    }

    return (data as DbxPaymentIntentRecord | null) || null;
  }

  async findByReferenceOrThrow(reference: string): Promise<DbxPaymentIntentRecord> {
    const intent = await this.findByReference(reference);
    if (!intent) {
      throw new NotFoundException({
        code: "DBX_INTENT_NOT_FOUND",
        message: "DBX payment intent not found",
      });
    }
    return intent;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<DbxPaymentIntentRecord | null> {
    const { data, error } = await this.supabase.client
      .schema("app_public")
      .from("dbx_crypto_payment_intents")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException({
        code: "DBX_IDEMPOTENCY_LOOKUP_FAILED",
        message: error.message,
      });
    }

    return (data as DbxPaymentIntentRecord | null) || null;
  }

  async findBySignature(signature: string): Promise<DbxPaymentIntentRecord | null> {
    const { data, error } = await this.supabase.client
      .schema("app_public")
      .from("dbx_crypto_payment_intents")
      .select("*")
      .eq("transaction_signature", signature)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException({
        code: "DBX_SIGNATURE_LOOKUP_FAILED",
        message: error.message,
      });
    }

    return (data as DbxPaymentIntentRecord | null) || null;
  }

  async transitionStatus(
    id: string,
    nextStatus: DbxPaymentStatus,
    patch: Partial<DbxPaymentIntentRecord> = {},
  ): Promise<DbxPaymentIntentRecord> {
    const { data, error } = await this.supabase.client
      .schema("app_public")
      .from("dbx_crypto_payment_intents")
      .update({
        ...patch,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new InternalServerErrorException({
        code: "DBX_STATUS_TRANSITION_FAILED",
        message: error.message,
      });
    }

    return data as DbxPaymentIntentRecord;
  }

  async createVerification(input: {
    intentId: string;
    reference: string;
    transactionSignature: string;
    status: "passed" | "failed";
    reason?: string | null;
    rawResponse: Record<string, unknown>;
  }): Promise<DbxPaymentVerificationRecord> {
    const { data, error } = await this.supabase.client
      .schema("app_public")
      .from("dbx_crypto_payment_verifications")
      .insert({
        intent_id: input.intentId,
        reference: input.reference,
        transaction_signature: input.transactionSignature,
        status: input.status,
        reason: input.reason || null,
        raw_response: input.rawResponse || {},
      })
      .select("*")
      .single();

    if (error) {
      throw new InternalServerErrorException({
        code: "DBX_VERIFICATION_CREATE_FAILED",
        message: error.message,
      });
    }

    return data as DbxPaymentVerificationRecord;
  }

  async addEvent(
    intentId: string,
    eventType: DbxPaymentEventType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await this.supabase.client
      .schema("app_public")
      .from("dbx_crypto_payment_events")
      .insert({
        intent_id: intentId,
        event_type: eventType,
        payload,
      });

    if (error) {
      throw new InternalServerErrorException({
        code: "DBX_EVENT_CREATE_FAILED",
        message: error.message,
      });
    }
  }
}
