import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { WalletHoldDto } from "./dto/wallet-hold.dto";
import { WalletOrchestrationService } from "./wallet-orchestration.service";
import { WalletReleaseDto } from "./dto/wallet-release.dto";
import { WalletSettlementDto } from "./dto/wallet-settlement.dto";

@ApiTags("wallet-orchestration")
@Controller({
  path: "wallet/orchestration",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class WalletOrchestrationController {
  constructor(
    private readonly walletOrchestration: WalletOrchestrationService,
  ) {}

  @Post("hold")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal wallet hold flow",
  })
  async hold(
    @Body() body: WalletHoldDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.walletOrchestration.holdFunds(body, requestId);
  }

  @Post("release")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal wallet release flow",
  })
  async release(
    @Body() body: WalletReleaseDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.walletOrchestration.releaseFunds(body, requestId);
  }

  @Post("settlement")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal wallet settlement flow",
  })
  async settle(
    @Body() body: WalletSettlementDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.walletOrchestration.settleHeldFunds(body, requestId);
  }
}
