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
import { CheckoutSettlementDto } from "./dto/checkout-settlement.dto";
import { CheckoutSettlementService } from "./checkout-settlement.service";

@ApiTags("checkout-settlement")
@Controller({
  path: "payments",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class CheckoutSettlementController {
  constructor(
    private readonly checkoutSettlement: CheckoutSettlementService,
  ) {}

  @Post("checkout-settlement")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal checkout settlement into the NestJS economic layer",
  })
  async settle(
    @Body() body: CheckoutSettlementDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.checkoutSettlement.settle(body, requestId);
  }
}
