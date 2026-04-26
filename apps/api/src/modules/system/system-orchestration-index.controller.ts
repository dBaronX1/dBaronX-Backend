import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemOrchestrationIndexService } from "./system-orchestration-index.service";

@ApiTags("system-orchestration-index")
@Controller({
  path: "system/orchestration-index",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemOrchestrationIndexController {
  constructor(
    private readonly orchestrationIndex: SystemOrchestrationIndexService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal orchestration route index across canonical NestJS modules",
  })
  async getIndex() {
    return this.orchestrationIndex.build();
  }
}
