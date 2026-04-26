import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { PaymentsAdminService } from "./payments-admin.service";

@ApiTags("payments-admin")
@Controller({
  path: "payments/admin",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class PaymentsAdminController {
  constructor(private readonly paymentsAdmin: PaymentsAdminService) {}

  @Get("dashboard")
  @ApiOperation({
    summary: "Internal payments preflight and settlement dashboard",
  })
  async getDashboard() {
    return this.paymentsAdmin.dashboard();
  }
}
