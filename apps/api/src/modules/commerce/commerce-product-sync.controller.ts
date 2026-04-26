import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { CommerceProductSyncService } from "./commerce-product-sync.service";

@ApiTags("commerce-product-sync")
@Controller({
  path: "commerce/products",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CommerceProductSyncController {
  constructor(
    private readonly commerceProductSync: CommerceProductSyncService,
  ) {}

  @Post("sync")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal Medusa product sync into NestJS commerce mirror",
  })
  async sync(@Headers("x-request-id") requestId?: string) {
    return this.commerceProductSync.sync(requestId);
  }
}
