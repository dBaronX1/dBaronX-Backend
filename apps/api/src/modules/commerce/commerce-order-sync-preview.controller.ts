import { Controller, Get, Headers, Param, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { CommerceOrderSyncPreviewService } from "./commerce-order-sync-preview.service";

@ApiTags("commerce-order-sync-preview")
@Controller({
  path: "commerce/orders",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CommerceOrderSyncPreviewController {
  constructor(
    private readonly commerceOrderSyncPreview: CommerceOrderSyncPreviewService,
  ) {}

  @Get(":medusaOrderId/preview-sync")
  @ApiOperation({
    summary:
      "Internal preview of Medusa-to-NestJS order sync state before reconciliation",
  })
  async preview(
    @Param("medusaOrderId") medusaOrderId: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.commerceOrderSyncPreview.preview(medusaOrderId, requestId);
  }
}
