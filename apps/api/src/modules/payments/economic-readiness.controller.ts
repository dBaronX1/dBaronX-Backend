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
    try {
      const result = this.economicEvents.validate(body);
      return {
        success: result.blockers.length === 0,
        dryRun: true,
        blockers: result.blockers,
        event: result.event,
        auditPayload: result.auditPayload,
      };
    } catch (error) {
      const response = typeof (error as { getResponse?: () => unknown }).getResponse === "function"
        ? (error as { getResponse: () => unknown }).getResponse()
        : null;
      const blockers = Array.isArray((response as { blockers?: unknown[] } | null)?.blockers)
        ? ((response as { blockers: string[] }).blockers)
        : ["economic_event_dry_run_validation_failed"];
      return {
        success: false,
        dryRun: true,
        blockers,
        auditPayload: (response as { auditPayload?: unknown } | null)?.auditPayload || null,
      };
    }
  }
}
