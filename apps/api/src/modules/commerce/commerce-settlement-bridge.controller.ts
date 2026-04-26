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
import { CommerceSettlementDto } from "./dto/commerce-settlement.dto";
import { CommerceSettlementBridgeService } from "./commerce-settlement-bridge.service";

@ApiTags("commerce-settlement-bridge")
@Controller({
  path: "commerce/settlements",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CommerceSettlementBridgeController {
  constructor(
    private readonly commerceSettlementBridge: CommerceSettlementBridgeService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Internal commerce settlement bridge across checkout, affiliate, supplier and wallet layers",
  })
  async settle(
    @Body() body: CommerceSettlementDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.commerceSettlementBridge.settle(body, requestId);
  }
}
