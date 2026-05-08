import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../shared/decorators/public.decorator";
import { PaymentReadinessService } from "./payment-readiness.service";

@ApiTags("payment-readiness")
@Controller({ path: "payments/readiness", version: VERSION_NEUTRAL })
export class PaymentReadinessController {
  constructor(private readonly readiness: PaymentReadinessService) {}

  @Public()
  @Get()
  getReadiness() {
    return this.readiness.getReadiness();
  }
}
