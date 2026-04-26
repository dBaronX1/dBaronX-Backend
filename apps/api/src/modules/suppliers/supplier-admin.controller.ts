import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SupplierAdminService } from "./supplier-admin.service";

@ApiTags("supplier-admin")
@Controller({
  path: "suppliers/admin",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SupplierAdminController {
  constructor(private readonly supplierAdmin: SupplierAdminService) {}

  @Get("dashboard")
  @ApiOperation({
    summary: "Internal supplier operations dashboard",
  })
  async getDashboard() {
    return this.supplierAdmin.dashboard();
  }
}
