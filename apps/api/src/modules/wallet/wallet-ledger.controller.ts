import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { CreateLedgerEntryDto } from "./dto/create-ledger-entry.dto";
import { PayoutEligibilityDto } from "./dto/payout-eligibility.dto";
import { WalletAdjustmentDto } from "./dto/wallet-adjustment.dto";
import { WalletLedgerService } from "./wallet-ledger.service";

@ApiTags("wallet-ledger")
@Controller({
  path: "wallet",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class WalletLedgerController {
  constructor(private readonly walletLedger: WalletLedgerService) {}

  @Get(":userId")
  @ApiOperation({
    summary: "Internal wallet balance snapshot",
  })
  async getWallet(
    @Param("userId") userId: string,
    @Query("currency") currency: string,
  ) {
    return {
      success: true,
      wallet: await this.walletLedger.getWalletSnapshot(userId, currency),
    };
  }

  @Post("ledger-entry")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Internal create ledger entry",
  })
  async createLedgerEntry(@Body() body: CreateLedgerEntryDto) {
    return this.walletLedger.createLedgerEntry({
      userId: body.userId,
      currency: body.currency,
      amount: body.amount,
      direction: body.direction,
      source: body.source as any,
      referenceId: body.referenceId,
      referenceType: body.referenceType,
      description: body.description,
      metadata: body.metadata,
    });
  }

  @Post("adjustment")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Internal manual wallet adjustment",
  })
  async createAdjustment(@Body() body: WalletAdjustmentDto) {
    return this.walletLedger.applyManualAdjustment({
      userId: body.userId,
      currency: body.currency,
      amount: body.amount,
      reason: body.reason,
      actorId: body.actorId,
      metadata: body.metadata,
    });
  }

  @Post("payout-eligibility")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal payout eligibility check",
  })
  async payoutEligibility(@Body() body: PayoutEligibilityDto) {
    return {
      success: true,
      payoutEligibility: await this.walletLedger.checkPayoutEligibility(
        body.userId,
        body.currency,
        body.requestedAmount,
      ),
    };
  }
}
