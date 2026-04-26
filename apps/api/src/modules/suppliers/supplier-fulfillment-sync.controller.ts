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
import { SupplierFulfillmentSyncService } from "./supplier-fulfillment-sync.service";

@ApiTags("supplier-fulfillment-sync")
@Controller({
  path: "suppliers/fulfillment",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SupplierFulfillmentSyncController {
  constructor(
    private readonly supplierFulfillmentSync: SupplierFulfillmentSyncService,
  ) {}

  @Post(":medusaOrderId/sync")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal supplier fulfillment sync from Medusa fulfillment state",
  })
  async sync(
    @Param("medusaOrderId") medusaOrderId: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.supplierFulfillmentSync.syncFromMedusa(
      medusaOrderId,
      requestId,
    );
  }
}
