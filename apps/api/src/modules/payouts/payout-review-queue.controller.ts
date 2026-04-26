import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { PayoutReviewQueueService } from "./payout-review-queue.service";

@ApiTags("payout-review-queue")
@Controller({
  path: "payouts/review-queue",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class PayoutReviewQueueController {
  constructor(
    private readonly payoutReviewQueue: PayoutReviewQueueService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal payout review queue prioritized for operations handling",
  })
  async getSnapshot() {
    return this.payoutReviewQueue.snapshot();
  }
}
