import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemRuntimeContractService } from "../../shared/services/system-runtime-contract.service";

@ApiTags("system-runtime-contract")
@Controller({
  path: "system/runtime-contract",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemRuntimeContractController {
  constructor(
    private readonly runtimeContract: SystemRuntimeContractService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal runtime contract for final launch-hardening inspection",
  })
  async getSnapshot() {
    return this.runtimeContract.build();
  }
}
