import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { WalletAdminService } from "./wallet-admin.service";

@ApiTags("wallet-admin")
@Controller({
  path: "wallet/admin",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class WalletAdminController {
  constructor(private readonly walletAdmin: WalletAdminService) {}

  @Get("dashboard")
  @ApiOperation({
    summary: "Internal wallet and ledger operations dashboard",
  })
  async getDashboard() {
    return this.walletAdmin.dashboard();
  }
}
