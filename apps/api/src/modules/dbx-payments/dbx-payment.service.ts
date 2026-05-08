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
import { DbxSignatureValidator } from "./validators/dbx-signature.validator";
import { DbxWalletValidator } from "./validators/dbx-wallet.validator";
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
  private readonly signatures = new DbxSignatureValidator();
  private readonly wallets = new DbxWalletValidator();

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
    const commerceReference = (dto.cartId || dto.orderRef || dto.medusaOrderId || "").trim();
    if (!commerceReference) {
      throw new BadRequestException({
        code: "DBX_COMMERCE_REFERENCE_REQUIRED",
        message: "cartId or orderRef is required to create a DBX payment intent.",
      });
    }

    const expectedDbxBaseUnits = this.normalizePositiveIntegerString(
      dto.expectedDbxBaseUnits,
      "expectedDbxBaseUnits",
    );

    const treasuryWallet = this.wallets.assertWallet(
      this.config.treasuryWallet,
      "dbxPaymentAddress",
    );
    const senderWallet = this.wallets.optionalWallet(dto.senderWallet, "senderWallet");

    const expiresAt = DateUtil.addMinutes(
      new Date(),
      this.config.intentTtlMinutes,
    ).toISOString();

    const intent = await this.repository.createIntent({
      reference: this.reference.createReference(),
      userId: actorUserId || dto.userId || null,
      email: dto.email.trim().toLowerCase(),
      customerName: dto.customerName.trim(),
      cartId: commerceReference,
      medusaOrderId: dto.medusaOrderId?.trim() || null,
      expectedUsdCents: dto.expectedUsdCents,
      expectedDbxBaseUnits,
      dbxMint: this.wallets.assertWallet(this.config.mintAddress, "dbxMint"),
      treasuryWallet,
      senderWallet,
      expiresAt,
      idempotencyKey: dto.idempotencyKey?.trim() || null,
      metadata: {
        ...(dto.metadata || {}),
        orderRef: dto.orderRef?.trim() || null,
        currency: (dto.currency || "USD").toUpperCase(),
        dbxPaymentAddress: treasuryWallet,
        solanaRpcConfigured: this.config.solanaRpcConfigured,
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
    const transactionSignature = this.extractTransactionSignature(dto);
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

    const duplicate = await this.repository.findBySignature(transactionSignature);
    if (duplicate && duplicate.reference !== checked.reference) {
      throw new ConflictException({
        code: "DBX_SIGNATURE_ALREADY_USED",
        message: "This transaction signature is already attached to another DBX payment.",
      });
    }

    const updated = await this.transition(checked, "submitted", {
      transaction_signature: transactionSignature,
      sender_wallet: this.wallets.optionalWallet(dto.senderWallet, "senderWallet") || checked.sender_wallet,
    });

    await this.repository.addEvent(updated.id, "intent_submitted", {
      reference: updated.reference,
      transactionSignature: updated.transaction_signature,
      senderWallet: updated.sender_wallet,
    });

    return updated;
  }

  async confirmPayment(dto: ConfirmDbxPaymentDto): Promise<DbxPaymentIntentRecord> {
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
      const transactionSignature = this.extractTransactionSignature(dto);
      const submitted = await this.submitPayment({
        intentReference: dto.intentReference,
        transactionSignature,
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
        signature: transactionSignature,
      });

      const verification = await this.verifier.verify({
        intentReference: checked.reference,
        transactionSignature,
        expectedMint: checked.dbx_mint,
        expectedTreasuryWallet: checked.treasury_wallet,
        expectedAmountBaseUnits: checked.expected_dbx_base_units,
        expectedSenderWallet: checked.sender_wallet,
        expiresAt: checked.expires_at,
      });

      await this.repository.createVerification({
        intentId: checked.id,
        reference: checked.reference,
        transactionSignature,
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
          signature: transactionSignature,
        });

        return failed;
      }

      const verified = await this.transition(checked, "verified", {
        verified_at: new Date().toISOString(),
        failure_reason: null,
      });

      await this.repository.addEvent(verified.id, "verification_succeeded", {
        reference: verified.reference,
        signature: transactionSignature,
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

  private extractTransactionSignature(dto: {
    transactionSignature?: string | null;
    txHash?: string | null;
  }): string {
    const raw = dto.transactionSignature || dto.txHash || "";
    return this.signatures.assertSignature(raw);
  }

  private normalizePositiveIntegerString(value: unknown, fieldName: string): string {
    const normalized = String(value ?? "").trim();

    if (!/^\d+$/.test(normalized) || BigInt(normalized || "0") <= 0n) {
      throw new BadRequestException({
        code: "DBX_EXPECTED_AMOUNT_REQUIRED",
        message: `${fieldName} must be a positive integer base-unit amount.`,
      });
    }

    return normalized;
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
