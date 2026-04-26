import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemCompatibilityService } from "./system-compatibility.service";

@ApiTags("system-compatibility")
@Controller({
  path: "system/compatibility",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemCompatibilityController {
  constructor(
    private readonly systemCompatibility: SystemCompatibilityService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal compatibility snapshot across ecosystem services",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.systemCompatibility.snapshot(requestId);
  }
}
