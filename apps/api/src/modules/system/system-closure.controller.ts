import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemClosureService } from "./system-closure.service";

@ApiTags("system-closure")
@Controller({
  path: "system/closure",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemClosureController {
  constructor(private readonly systemClosure: SystemClosureService) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal final system closure snapshot across environment, startup, commerce and launch gate",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.systemClosure.snapshot(requestId);
  }
}
