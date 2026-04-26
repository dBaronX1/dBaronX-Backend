import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemAdminEndpointRegistryService } from "./system-admin-endpoint-registry.service";

@ApiTags("system-admin-endpoint-registry")
@Controller({
  path: "system/admin-endpoints",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemAdminEndpointRegistryController {
  constructor(
    private readonly registry: SystemAdminEndpointRegistryService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal registry of canonical admin and ops endpoints",
  })
  async getRegistry() {
    return this.registry.build();
  }
}
