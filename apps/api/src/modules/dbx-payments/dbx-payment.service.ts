import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { DateUtil } from "../../shared/utils/date.util";
import { LockService } from "../../shared/services/lock.service";
import { CreateDbxPaymentIntentDto } from "./dto/create-dbx-payment-intent.dto";
import { SubmitDbxPaymentDto } from "./dto/submit-dbx-payment.dto";
import { ConfirmDbxPaymentDto } from "./dto/confirm-dbx-payment.dto";
import { DbxChainVerifierClient } from "./dbx-chain-verifier.client";
import { DbxMedusaCommerceAdapter } from "./dbx-medusa-commerce.adapter";
import { DbxPaymentConfig } from "./dbx-payment.config";
import { DbxPaymentReferenceService } from "./dbx-payment-reference.service";
import { DbxPaymentRepository } from "./dbx-payment.repository";
import {
  DbxPaymentIntentRecord,
  DbxPaymentStatus,
} from "./types/dbx-payment.types";

@Injectable()
export class DbxPaymentService {
  private toRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return { value };
  }

  private readonly logger = new Logger(DbxPaymentService.name);

  private readonly allowedTransitions: Record<DbxPaymentStatus, DbxPaymentStatus[]> = {
    pending: ["submitted", "expired", "failed"],
    submitted: ["verified", "expired", "failed"],
    verified: ["completed", "verified_pending_order_sync"],
    verified_pending_order_sync: ["completed", "failed"],
    completed: [],
    expired: [],
    failed: [],
  };

  constructor(
    private readonly config: DbxPaymentConfig,
    private readonly repository: DbxPaymentRepository,
    private readonly reference: DbxPaymentReferenceService,
    private readonly verifier: DbxChainVerifierClient,
    private readonly medusa: DbxMedusaCommerceAdapter,
    private readonly locks: LockService,
  ) {}

  async createIntent(
    dto: CreateDbxPaymentIntentDto,
    actorUserId?: string | null,
  ): Promise<DbxPaymentIntentRecord> {
    this.assertRuntimeConfigured();

    const expiresAt = DateUtil.addMinutes(
      new Date(),
      this.config.intentTtlMinutes,
    ).toISOString();

    const intent = await this.repository.createIntent({
      reference: this.reference.createReference(),
      userId: actorUserId || dto.userId || null,
      email: dto.email.trim().toLowerCase(),
      customerName: dto.customerName.trim(),
      cartId: dto.cartId.trim(),
      medusaOrderId: dto.medusaOrderId?.trim() || null,
      expectedUsdCents: dto.expectedUsdCents,
      expectedDbxBaseUnits: String(dto.expectedDbxBaseUnits),
      dbxMint: this.config.mintAddress,
      treasuryWallet: this.config.treasuryWallet,
      senderWallet: dto.senderWallet?.trim() || null,
      expiresAt,
      idempotencyKey: dto.idempotencyKey?.trim() || null,
      metadata: {
        ...(dto.metadata || {}),
        source: "nestjs_dbx_payment_service",
      },
    });

    return intent;
  }

  async getIntent(reference: string): Promise<DbxPaymentIntentRecord> {
    const intent = await this.findIntentByReferenceOrThrowCompat(reference);
    return this.expireIfNeeded(intent);
  }

  async submitPayment(dto: SubmitDbxPaymentDto): Promise<DbxPaymentIntentRecord> {
    this.assertRuntimeConfigured();

    const intent = await this.findIntentByReferenceOrThrowCompat(dto.intentReference);
    const checked = await this.expireIfNeeded(intent);

    if (checked.status === "expired") {
      throw new BadRequestException({
        code: "DBX_INTENT_EXPIRED",
        message: "DBX payment intent has expired.",
      });
    }

    if (checked.status === "completed") {
      return checked;
    }

    if (!["pending", "submitted"].includes(checked.status)) {
      throw new ConflictException({
        code: "DBX_INTENT_NOT_SUBMITTABLE",
        message: `Intent cannot be submitted from status ${checked.status}.`,
      });
    }

    const duplicate = await this.repository.findBySignature(dto.transactionSignature);
    if (duplicate && duplicate.reference !== checked.reference) {
      throw new ConflictException({
        code: "DBX_SIGNATURE_ALREADY_USED",
        message: "This transaction signature is already attached to another DBX payment.",
      });
    }

    const updated = await this.transition(checked, "submitted", {
      transaction_signature: dto.transactionSignature.trim(),
      sender_wallet: dto.senderWallet?.trim() || checked.sender_wallet,
    });

    await this.repository.addEvent(updated.id, "intent_submitted", {
      reference: updated.reference,
      transactionSignature: updated.transaction_signature,
      senderWallet: updated.sender_wallet,
    });

    return updated;
  }

  async confirmPayment(dto: ConfirmDbxPaymentDto): Promise<DbxPaymentIntentRecord> {
    this.assertRuntimeConfigured();

    const normalizedLockReference = this.reference.normalizeForLookup(dto.intentReference);
    const lockKey = `dbx-payment-confirm:${normalizedLockReference}`;
    const lock = this.locks.acquire(lockKey, 30_000);

    if (!lock.acquired || !lock.token) {
      throw new ConflictException({
        code: "DBX_CONFIRM_IN_PROGRESS",
        message: "DBX payment confirmation is already in progress.",
      });
    }

    try {
      const submitted = await this.submitPayment({
        intentReference: dto.intentReference,
        transactionSignature: dto.transactionSignature,
      });

      if (submitted.status === "completed") {
        return submitted;
      }

      const checked = await this.expireIfNeeded(submitted);
      if (checked.status === "expired") {
        throw new BadRequestException({
          code: "DBX_INTENT_EXPIRED",
          message: "DBX payment intent has expired.",
        });
      }

      await this.repository.addEvent(checked.id, "verification_requested", {
        reference: checked.reference,
        signature: dto.transactionSignature,
      });

      const verification = await this.verifier.verify({
        intentReference: checked.reference,
        transactionSignature: dto.transactionSignature,
        expectedMint: checked.dbx_mint,
        expectedTreasuryWallet: checked.treasury_wallet,
        expectedAmountBaseUnits: checked.expected_dbx_base_units,
        expectedSenderWallet: checked.sender_wallet,
        expiresAt: checked.expires_at,
      });

      await this.repository.createVerification({
        intentId: checked.id,
        reference: checked.reference,
        transactionSignature: dto.transactionSignature,
        status: verification.verified ? "passed" : "failed",
        reason: verification.reason || null,
        rawResponse: this.toRecord(verification.raw || verification),
      });

      if (!verification.verified) {
        const failed = await this.transition(checked, "failed", {
          failure_reason: verification.reason || "DBX transaction verification failed",
        });

        await this.repository.addEvent(failed.id, "verification_failed", {
          reference: failed.reference,
          reason: verification.reason || null,
          signature: dto.transactionSignature,
        });

        return failed;
      }

      const verified = await this.transition(checked, "verified", {
        verified_at: new Date().toISOString(),
        failure_reason: null,
      });

      await this.repository.addEvent(verified.id, "verification_succeeded", {
        reference: verified.reference,
        signature: dto.transactionSignature,
        amountBaseUnits: verification.amountBaseUnits,
        sender: verification.sender,
        receiver: verification.receiver,
      });

      return this.completeVerifiedPayment(verified);
    } finally {
      this.locks.release(lockKey, lock.token);
    }
  }

  async retryOrderSync(reference: string): Promise<DbxPaymentIntentRecord> {
    const intent = await this.findIntentByReferenceOrThrowCompat(reference);

    if (!["verified", "verified_pending_order_sync"].includes(intent.status)) {
      throw new ConflictException({
        code: "DBX_ORDER_SYNC_NOT_ALLOWED",
        message: `Order sync cannot run from status ${intent.status}.`,
      });
    }

    return this.completeVerifiedPayment(intent);
  }

  private assertRuntimeConfigured(): void {
    const blockers = this.config.runtimeBlockers;
    if (blockers.length === 0) return;

    throw new BadRequestException({
      code: "DBX_PAYMENT_RUNTIME_NOT_CONFIGURED",
      message: "DBX payment runtime is not fully configured.",
      blockers,
    });
  }

  private async findIntentByReferenceOrThrowCompat(
    rawReference: string,
  ): Promise<DbxPaymentIntentRecord> {
    const candidates = this.reference.toLookupCandidates(rawReference);

    for (const candidate of candidates) {
      const intent = await this.repository.findByReference(candidate);
      if (intent) {
        return intent;
      }
    }

    return this.repository.findByReferenceOrThrow(rawReference);
  }

  private async completeVerifiedPayment(
    intent: DbxPaymentIntentRecord,
  ): Promise<DbxPaymentIntentRecord> {
    try {
      const sync = await this.medusa.completeOrderForDbxPayment(intent);

      await this.repository.addEvent(intent.id, "order_sync_succeeded", {
        reference: intent.reference,
        medusaOrderId: sync.medusaOrderId || null,
      });

      const completed = await this.transition(intent, "completed", {
        completed_at: new Date().toISOString(),
        failure_reason: null,
      });

      await this.repository.addEvent(completed.id, "intent_completed", {
        reference: completed.reference,
        medusaOrderId: completed.medusa_order_id,
      });

      return completed;
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: "dbx_payment_order_sync_failed",
          reference: intent.reference,
          error: error instanceof Error ? error.message : String(error),
        }),
      );

      const pendingSync = await this.transition(
        intent,
        "verified_pending_order_sync",
        {
          failure_reason:
            error instanceof Error ? error.message : "Order sync failed",
        },
      );

      await this.repository.addEvent(pendingSync.id, "order_sync_failed", {
        reference: pendingSync.reference,
        medusaOrderId: pendingSync.medusa_order_id,
        error: error instanceof Error ? error.message : String(error),
      });

      return pendingSync;
    }
  }

  private async expireIfNeeded(
    intent: DbxPaymentIntentRecord,
  ): Promise<DbxPaymentIntentRecord> {
    if (["completed", "expired", "failed"].includes(intent.status)) {
      return intent;
    }

    if (new Date(intent.expires_at).getTime() > Date.now()) {
      return intent;
    }

    const expired = await this.transition(intent, "expired", {
      failure_reason: "Payment intent expired",
    });

    await this.repository.addEvent(expired.id, "intent_expired", {
      reference: expired.reference,
      expiresAt: expired.expires_at,
    });

    return expired;
  }

  private async transition(
    intent: DbxPaymentIntentRecord,
    nextStatus: DbxPaymentStatus,
    patch: Partial<DbxPaymentIntentRecord> = {},
  ): Promise<DbxPaymentIntentRecord> {
    const allowed = this.allowedTransitions[intent.status] || [];

    if (!allowed.includes(nextStatus) && intent.status !== nextStatus) {
      throw new ConflictException({
        code: "DBX_INVALID_STATE_TRANSITION",
        message: `Invalid DBX payment transition ${intent.status} → ${nextStatus}.`,
      });
    }

    return this.repository.transitionStatus(intent.id, nextStatus, patch);
  }
}
