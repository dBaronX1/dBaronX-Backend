import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { Public } from "../../shared/decorators/public.decorator";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { RateLimitGuard } from "../../shared/guards/rate-limit.guard";
import { CreateDbxPaymentIntentDto } from "./dto/create-dbx-payment-intent.dto";
import { SubmitDbxPaymentDto } from "./dto/submit-dbx-payment.dto";
import { ConfirmDbxPaymentDto } from "./dto/confirm-dbx-payment.dto";
import { DbxPaymentService } from "./dbx-payment.service";

type AuthUser = {
  id?: string;
  sub?: string;
  email?: string;
  role?: string;
};

@Public()
@Controller("dbx-payments")
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class DbxPaymentController {
  constructor(private readonly service: DbxPaymentService) {}

  @Post("intents")
  async createIntent(
    @Body() dto: CreateDbxPaymentIntentDto,
    @CurrentUser() user: AuthUser,
  ) {
    const actorUserId = user?.id || user?.sub || null;
    const intent = await this.service.createIntent(dto, actorUserId);

    return {
      success: true,
      data: {
        id: intent.id,
        reference: intent.reference,
        status: intent.status,
        cartId: intent.cart_id,
        medusaOrderId: intent.medusa_order_id,
        orderRef: intent.metadata?.orderRef || null,
        expectedUsdCents: intent.expected_usd_cents,
        currency: intent.metadata?.currency || "USD",
        expectedDbxBaseUnits: intent.expected_dbx_base_units,
        dbxMint: intent.dbx_mint,
        dbxPaymentAddress: intent.treasury_wallet,
        treasuryWallet: intent.treasury_wallet,
        senderWallet: intent.sender_wallet,
        expiresAt: intent.expires_at,
        idempotencyKey: intent.idempotency_key,
        paymentMarkedPaid: false,
        instructions: {
          network: "solana",
          tokenSymbol: "DBX",
          tokenMint: intent.dbx_mint,
          decimals: 9,
          receiverAddress: intent.treasury_wallet,
          amountBaseUnits: intent.expected_dbx_base_units,
          reference: intent.reference,
          expiresAt: intent.expires_at,
        },
        createdAt: intent.created_at,
      },
    };
  }

  @Post("submit")
  async submit(@Body() dto: SubmitDbxPaymentDto) {
    const intent = await this.service.submitPayment(dto);

    return {
      success: true,
      data: {
        reference: intent.reference,
        status: intent.status,
        transactionSignature: intent.transaction_signature,
        txHash: intent.transaction_signature,
        verificationStatus: intent.status === "submitted" ? "verification_pending" : intent.status,
        expiresAt: intent.expires_at,
        paymentMarkedPaid: intent.status === "completed",
      },
    };
  }

  @Post("confirm")
  async confirm(@Body() dto: ConfirmDbxPaymentDto) {
    const intent = await this.service.confirmPayment(dto);

    return {
      success: true,
      data: {
        reference: intent.reference,
        status: intent.status,
        transactionSignature: intent.transaction_signature,
        txHash: intent.transaction_signature,
        verifiedAt: intent.verified_at,
        completedAt: intent.completed_at,
        failureReason: intent.failure_reason,
        paymentMarkedPaid: intent.status === "completed",
        orderSyncReady: intent.status === "completed",
        orderSyncStatus: intent.status === "verified_pending_order_sync"
          ? "payment_confirmed_order_sync_pending"
          : intent.status === "completed"
            ? "order_sync_completed"
            : "not_ready",
      },
    };
  }

  @Post(":reference/retry-order-sync")
  async retryOrderSync(@Param("reference") reference: string) {
    const intent = await this.service.retryOrderSync(reference);

    return {
      success: true,
      data: {
        reference: intent.reference,
        status: intent.status,
        completedAt: intent.completed_at,
        failureReason: intent.failure_reason,
      },
    };
  }

  @Get(":reference")
  async getIntent(@Param("reference") reference: string) {
    const intent = await this.service.getIntent(reference);

    return {
      success: true,
      data: {
        id: intent.id,
        reference: intent.reference,
        status: intent.status,
        cartId: intent.cart_id,
        medusaOrderId: intent.medusa_order_id,
        orderRef: intent.metadata?.orderRef || null,
        expectedUsdCents: intent.expected_usd_cents,
        currency: intent.metadata?.currency || "USD",
        expectedDbxBaseUnits: intent.expected_dbx_base_units,
        dbxMint: intent.dbx_mint,
        dbxPaymentAddress: intent.treasury_wallet,
        treasuryWallet: intent.treasury_wallet,
        senderWallet: intent.sender_wallet,
        transactionSignature: intent.transaction_signature,
        txHash: intent.transaction_signature,
        verificationStatus: intent.status === "submitted" ? "verification_pending" : intent.status,
        expiresAt: intent.expires_at,
        paymentMarkedPaid: intent.status === "completed",
        verifiedAt: intent.verified_at,
        completedAt: intent.completed_at,
        failureReason: intent.failure_reason,
      },
    };
  }
}
