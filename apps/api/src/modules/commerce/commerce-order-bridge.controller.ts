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
import { ManualOrderSyncDto } from "./dto/manual-order-sync.dto";
import { CommerceOrderBridgeService } from "./commerce-order-bridge.service";

@ApiTags("commerce-order-bridge")
@Controller({
  path: "commerce/orders",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CommerceOrderBridgeController {
  constructor(
    private readonly commerceOrderBridge: CommerceOrderBridgeService,
  ) {}

  @Post("sync")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Internal commerce-only Medusa order sync bridge with audit persistence",
  })
  async sync(
    @Body() body: ManualOrderSyncDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.commerceOrderBridge.syncOrder(body, requestId);
  }
}
