import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemCanonicalCompletionService } from "./system-canonical-completion.service";

@ApiTags("system-canonical-completion")
@Controller({
  path: "system/canonical-completion",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemCanonicalCompletionController {
  constructor(
    private readonly canonicalCompletion: SystemCanonicalCompletionService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal canonical completion surface for final done-pass confirmation",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.canonicalCompletion.build(requestId);
  }
}
