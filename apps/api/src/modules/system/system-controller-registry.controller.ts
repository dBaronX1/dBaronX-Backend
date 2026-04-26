import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemControllerRegistryService } from "./system-controller-registry.service";

@ApiTags("system-controller-registry")
@Controller({
  path: "system/controller-registry",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemControllerRegistryController {
  constructor(
    private readonly controllerRegistry: SystemControllerRegistryService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal registry of finalization controllers mounted into the canonical app shell",
  })
  async getSnapshot() {
    return this.controllerRegistry.build();
  }
}
