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
import { CommerceFulfillmentSyncService } from "./commerce-fulfillment-sync.service";

@ApiTags("commerce-fulfillment-sync")
@Controller({
  path: "commerce/fulfillment",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CommerceFulfillmentSyncController {
  constructor(
    private readonly commerceFulfillmentSync: CommerceFulfillmentSyncService,
  ) {}

  @Post(":medusaOrderId/sync")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal Medusa fulfillment sync into NestJS commerce bridge",
  })
  async sync(
    @Param("medusaOrderId") medusaOrderId: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.commerceFulfillmentSync.sync(medusaOrderId, requestId);
  }
}
