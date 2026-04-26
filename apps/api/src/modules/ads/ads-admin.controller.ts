import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { AdsAdminService } from "./ads-admin.service";

@ApiTags("ads-admin")
@Controller({
  path: "ads/admin",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class AdsAdminController {
  constructor(private readonly adsAdmin: AdsAdminService) {}

  @Get("dashboard")
  @ApiOperation({
    summary: "Internal ads campaign operations dashboard",
  })
  async getDashboard() {
    return this.adsAdmin.dashboard();
  }
}
