import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { EnvironmentContractService } from "../../shared/services/environment-contract.service";

@ApiTags("system-environment-contract")
@Controller({
  path: "system/environment-contract",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemEnvironmentContractController {
  constructor(
    private readonly environmentContract: EnvironmentContractService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal environment contract validation snapshot",
  })
  async getSnapshot() {
    return this.environmentContract.build();
  }
}
