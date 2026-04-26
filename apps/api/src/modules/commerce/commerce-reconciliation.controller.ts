import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { CommerceReconciliationService } from "./commerce-reconciliation.service";

@ApiTags("commerce-reconciliation")
@Controller({
  path: "commerce/reconciliation",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CommerceReconciliationController {
  constructor(
    private readonly commerceReconciliation: CommerceReconciliationService,
  ) {}

  @Post("orders/:medusaOrderId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Internal reconciliation across Medusa order state, local sync state and fulfillment state",
  })
  async reconcileOrder(
    @Param("medusaOrderId") medusaOrderId: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.commerceReconciliation.reconcileOrder(medusaOrderId, requestId);
  }
}
