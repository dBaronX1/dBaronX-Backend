import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../shared/decorators/public.decorator";
import { PaymentReadinessService } from "./payment-readiness.service";

@ApiTags("payment-readiness")
@Public()
@Controller({ path: "payments", version: VERSION_NEUTRAL })
export class PaymentReadinessController {
  constructor(private readonly readiness: PaymentReadinessService) {}

  @Get("readiness")
  snapshot() {
    return this.readiness.snapshot();
  }
}
