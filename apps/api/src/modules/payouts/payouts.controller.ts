import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { CreatePayoutRequestDto } from "./dto/create-payout-request.dto";
import { PayoutLifecycleService } from "./payout-lifecycle.service";

@ApiTags("payouts")
@Controller({
  path: "payouts",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class PayoutsController {
  constructor(private readonly payouts: PayoutLifecycleService) {}

  @Post("request")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Internal payout request lifecycle start",
  })
  async createRequest(
    @Body() body: CreatePayoutRequestDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.payouts.request(body, requestId);
  }

  @Post(":payoutRequestId/approve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal payout approval",
  })
  async approve(
    @Param("payoutRequestId") payoutRequestId: string,
    @Headers("x-actor-id") actorId?: string,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.payouts.approve(payoutRequestId, actorId, requestId);
  }

  @Post(":payoutRequestId/settle")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal payout settlement",
  })
  async settle(
    @Param("payoutRequestId") payoutRequestId: string,
    @Headers("x-actor-id") actorId?: string,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-external-reference") externalReference?: string,
  ) {
    return this.payouts.settle(
      payoutRequestId,
      actorId,
      externalReference,
      requestId,
    );
  }

  @Post(":payoutRequestId/reject")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal payout rejection",
  })
  async reject(
    @Param("payoutRequestId") payoutRequestId: string,
    @Headers("x-actor-id") actorId?: string,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-reason") reason?: string,
  ) {
    return this.payouts.reject(payoutRequestId, actorId, reason, requestId);
  }
}
