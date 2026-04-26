import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { CommerceHealthService } from "./commerce-health.service";

@ApiTags("commerce-health")
@Controller({
  path: "commerce/health",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CommerceHealthController {
  constructor(private readonly commerceHealth: CommerceHealthService) {}

  @Get()
  @ApiOperation({
    summary:
      "Internal commerce bridge health across NestJS, Medusa, and FastAPI",
  })
  async getSnapshot(@Headers("x-request-id") requestId?: string) {
    return this.commerceHealth.snapshot(requestId);
  }
}
