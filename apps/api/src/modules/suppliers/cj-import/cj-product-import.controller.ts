import { Body, Controller, Get, Param, Post, UseGuards, VERSION_NEUTRAL } from "@nestjs/common";
import { InternalAuthGuard } from "../../../shared/guards/internal-auth.guard";
import { CjProductImportService } from "./cj-product-import.service";
import { CjProductPublishService } from "./cj-product-publish.service";

@Controller({ path: "admin/cj/products", version: VERSION_NEUTRAL })
@UseGuards(InternalAuthGuard)
export class CjProductImportController {
  constructor(private readonly importer: CjProductImportService, private readonly publisher: CjProductPublishService) {}

  @Post("import-preview") preview(@Body() body: { category?: string; limit?: number }) { return this.importer.preview(body?.category || "all", body?.limit || 50); }
  @Post("import-run") run(@Body() body: { category?: string; limit?: number; requestedBy?: string }) { return this.importer.runImport(body?.category || "all", body?.limit || 50, body?.requestedBy); }
  @Get("import-runs") listRuns() { return this.importer.listRuns(); }
  @Get("import-items") listItems() { return this.importer.listItems(); }
  @Post("import-items/:id/approve") approve(@Param("id") id: string) { return this.publisher.approve(id); }
  @Post("import-items/:id/reject") reject(@Param("id") id: string) { return this.publisher.reject(id); }
  @Post("publish-approved") publishApproved() { return this.publisher.publishApproved(); }
  @Get("readiness") readiness() { return this.importer.readiness(); }
}
