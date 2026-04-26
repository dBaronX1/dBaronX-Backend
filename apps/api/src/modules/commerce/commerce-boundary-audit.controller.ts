import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { CommerceBoundaryAuditService } from "./commerce-boundary-audit.service";

@ApiTags("commerce-boundary-audit")
@Controller({
  path: "commerce/boundary-audit",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CommerceBoundaryAuditController {
  constructor(
    private readonly commerceBoundaryAudit: CommerceBoundaryAuditService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal audit of enforced Medusa commerce-only boundary policy",
  })
  async getSnapshot() {
    return this.commerceBoundaryAudit.build();
  }
}
