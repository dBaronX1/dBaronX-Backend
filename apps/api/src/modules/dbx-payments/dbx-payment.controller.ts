import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
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
        expectedUsdCents: intent.expected_usd_cents,
        expectedDbxBaseUnits: intent.expected_dbx_base_units,
        dbxMint: intent.dbx_mint,
        treasuryWallet: intent.treasury_wallet,
        senderWallet: intent.sender_wallet,
        expiresAt: intent.expires_at,
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
        expiresAt: intent.expires_at,
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
        verifiedAt: intent.verified_at,
        completedAt: intent.completed_at,
        failureReason: intent.failure_reason,
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
        expectedUsdCents: intent.expected_usd_cents,
        expectedDbxBaseUnits: intent.expected_dbx_base_units,
        dbxMint: intent.dbx_mint,
        treasuryWallet: intent.treasury_wallet,
        senderWallet: intent.sender_wallet,
        transactionSignature: intent.transaction_signature,
        expiresAt: intent.expires_at,
        verifiedAt: intent.verified_at,
        completedAt: intent.completed_at,
        failureReason: intent.failure_reason,
      },
    };
  }
}
