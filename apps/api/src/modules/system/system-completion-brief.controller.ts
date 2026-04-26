import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemCompletionBriefService } from "./system-completion-brief.service";

@ApiTags("system-completion-brief")
@Controller({
  path: "system/completion-brief",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemCompletionBriefController {
  constructor(
    private readonly completionBrief: SystemCompletionBriefService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal final completion brief summarizing canonical closure alignment",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.completionBrief.build(requestId);
  }
}
