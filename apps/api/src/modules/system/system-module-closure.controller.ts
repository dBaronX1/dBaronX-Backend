import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemModuleClosureService } from "./system-module-closure.service";

@ApiTags("system-module-closure")
@Controller({
  path: "system/module-closure",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemModuleClosureController {
  constructor(
    private readonly systemModuleClosure: SystemModuleClosureService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal module closure snapshot for canonical NestJS phase",
  })
  async getSnapshot() {
    return this.systemModuleClosure.build();
  }
}
