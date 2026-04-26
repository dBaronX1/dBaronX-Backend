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
import { CommerceVariantSyncService } from "./commerce-variant-sync.service";

@ApiTags("commerce-variant-sync")
@Controller({
  path: "commerce/products",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CommerceVariantSyncController {
  constructor(
    private readonly commerceVariantSync: CommerceVariantSyncService,
  ) {}

  @Post(":medusaProductId/variants-sync")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal Medusa variant sync into NestJS commerce mirror",
  })
  async sync(
    @Param("medusaProductId") medusaProductId: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.commerceVariantSync.sync(medusaProductId, requestId);
  }
}
