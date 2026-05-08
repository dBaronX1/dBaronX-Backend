import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../shared/decorators/public.decorator";
import { PaymentReadinessService } from "./payment-readiness.service";

@ApiTags("payment-readiness")
@Public()
@Controller({ path: "payments", version: VERSION_NEUTRAL })
export class PaymentReadinessController {
  constructor(private readonly readiness: PaymentReadinessService) {}

  @Get("readiness")
  @ApiOperation({
    summary: "Public-safe payment rail readiness without secret disclosure",
  })
  snapshot() {
    return this.readiness.snapshot();
  }
}
