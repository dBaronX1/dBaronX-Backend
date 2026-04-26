import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { PaymentPreflightIntelligenceDto } from "./dto/payment-preflight-intelligence.dto";
import { PaymentPreflightOrchestratorService } from "./payment-preflight-orchestrator.service";

@ApiTags("payment-orchestration")
@Controller({
  path: "payments/orchestration",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class PaymentOrchestrationController {
  constructor(
    private readonly paymentPreflightOrchestrator: PaymentPreflightOrchestratorService,
  ) {}

  @Post("preflight")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Internal orchestrated payment preflight decision with audit persistence",
  })
  async preflight(
    @Body() body: PaymentPreflightIntelligenceDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.paymentPreflightOrchestrator.evaluateAndAudit(body, requestId);
  }
}
