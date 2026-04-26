import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { CommerceAdminService } from "./commerce-admin.service";

@ApiTags("commerce-admin")
@Controller({
  path: "commerce/admin",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CommerceAdminController {
  constructor(private readonly commerceAdmin: CommerceAdminService) {}

  @Get("dashboard")
  @ApiOperation({
    summary: "Internal commerce sync, fulfillment, and settlement dashboard",
  })
  async getDashboard() {
    return this.commerceAdmin.dashboard();
  }
}
