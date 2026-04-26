import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { CommerceCatalogSyncService } from "./commerce-catalog-sync.service";

@ApiTags("commerce-catalog-sync")
@Controller({
  path: "commerce/catalog",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CommerceCatalogSyncController {
  constructor(
    private readonly commerceCatalogSync: CommerceCatalogSyncService,
  ) {}

  @Get("preview-sync")
  @ApiOperation({
    summary:
      "Internal commerce-only Medusa catalog preview sync for launch verification",
  })
  async previewSync(@Headers("x-request-id") requestId?: string) {
    return this.commerceCatalogSync.syncPreview(requestId);
  }
}
