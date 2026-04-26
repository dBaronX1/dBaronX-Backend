import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { MedusaFinalClosurePackService } from "../../shared/services/medusa-final-closure-pack.service";

@ApiTags("commerce-final-closure")
@Controller({
  path: "commerce/final-closure",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CommerceFinalClosureController {
  constructor(
    private readonly medusaFinalClosurePack: MedusaFinalClosurePackService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal final closure pack for Medusa commerce-only bridge hardening",
  })
  async getSnapshot() {
    return this.medusaFinalClosurePack.build();
  }
}
