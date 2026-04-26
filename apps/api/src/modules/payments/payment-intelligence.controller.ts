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
import { PaymentIntelligenceService } from "./payment-intelligence.service";

@ApiTags("payment-intelligence")
@Controller({
  path: "payments/intelligence",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class PaymentIntelligenceController {
  constructor(
    private readonly paymentIntelligence: PaymentIntelligenceService,
  ) {}

  @Post("preflight")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal payment preflight decision via FastAPI intelligence",
  })
  async preflight(
    @Body() body: PaymentPreflightIntelligenceDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.paymentIntelligence.preflight(body, requestId);
  }
}
