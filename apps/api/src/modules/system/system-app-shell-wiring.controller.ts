import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemAppShellWiringService } from "./system-app-shell-wiring.service";

@ApiTags("system-app-shell-wiring")
@Controller({
  path: "system/app-shell-wiring",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemAppShellWiringController {
  constructor(
    private readonly appShellWiring: SystemAppShellWiringService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal canonical app shell wiring surface for final controller/service consistency checks",
  })
  async getSnapshot() {
    return this.appShellWiring.build();
  }
}
