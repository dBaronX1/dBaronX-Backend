import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemServiceDependencyMapService } from "./system-service-dependency-map.service";

@ApiTags("system-service-dependency-map")
@Controller({
  path: "system/service-dependency-map",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemServiceDependencyMapController {
  constructor(
    private readonly systemServiceDependencyMap: SystemServiceDependencyMapService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal service dependency map for launch operations",
  })
  async getSnapshot() {
    return this.systemServiceDependencyMap.build();
  }
}
