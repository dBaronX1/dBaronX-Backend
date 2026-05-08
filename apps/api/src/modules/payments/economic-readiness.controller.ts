import { Body, Controller, Get, HttpCode, HttpStatus, Post, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../shared/decorators/public.decorator";
import { EconomicEventService } from "../../shared/services/economic-event.service";
import type { EconomicEventInput } from "../../shared/types/economic-event.types";

@ApiTags("economic-events")
@Public()
@Controller({ path: "payments", version: VERSION_NEUTRAL })
export class EconomicReadinessController {
  constructor(private readonly economicEvents: EconomicEventService) {}

  @Get("economic-readiness")
  @ApiOperation({ summary: "Unified economic event contract readiness" })
  readiness() {
    return this.economicEvents.readiness();
  }

  @Post("economic-events/dry-run")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Validate a unified economic event without settlement or persistence" })
  async dryRun(@Body() body: EconomicEventInput) {
    const result = await this.economicEvents.record(body);
    return {
      success: true,
      dryRun: true,
      blockers: result.blockers,
      event: result.event,
      auditPayload: result.auditPayload,
    };
  }
}
