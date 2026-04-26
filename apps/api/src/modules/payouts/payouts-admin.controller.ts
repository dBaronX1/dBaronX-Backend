import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { PayoutsAdminService } from "./payouts-admin.service";

@ApiTags("payouts-admin")
@Controller({
  path: "payouts/admin",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class PayoutsAdminController {
  constructor(private readonly payoutsAdmin: PayoutsAdminService) {}

  @Get("dashboard")
  @ApiOperation({
    summary: "Internal payouts operations dashboard",
  })
  async getDashboard() {
    return this.payoutsAdmin.dashboard();
  }
}
