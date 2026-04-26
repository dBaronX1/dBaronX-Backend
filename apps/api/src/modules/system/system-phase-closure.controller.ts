import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemPhaseClosureService } from "./system-phase-closure.service";

@ApiTags("system-phase-closure")
@Controller({
  path: "system/phase-closure",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemPhaseClosureController {
  constructor(
    private readonly phaseClosure: SystemPhaseClosureService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal subsystem phase-closure snapshot for NestJS",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.phaseClosure.build(requestId);
  }
}
