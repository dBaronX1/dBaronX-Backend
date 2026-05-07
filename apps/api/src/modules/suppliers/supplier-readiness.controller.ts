import {
  Controller,
  Get,
  Headers,
  UseGuards,
  VERSION_NEUTRAL,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { CjSupplierAdapterService } from "./adapters/cj/cj-supplier-adapter.service";
import { SupplierReadinessService } from "./supplier-readiness.service";

@ApiTags("supplier-readiness")
@Controller({
  path: "suppliers",
  version: VERSION_NEUTRAL,
})
@UseGuards(InternalAuthGuard)
export class SupplierReadinessController {
  constructor(
    private readonly readiness: SupplierReadinessService,
    private readonly cj: CjSupplierAdapterService,
  ) {}

  @Get("readiness")
  @ApiOperation({
    summary: "Internal server-only supplier credential readiness without secret disclosure",
  })
  async getReadiness(@Headers("x-request-id") _requestId?: string) {
    return this.readiness.snapshot();
  }

  @Get("cj/preflight")
  @ApiOperation({
    summary: "Internal CJ credential preflight without token disclosure",
  })
  async getCjPreflight(@Headers("x-request-id") _requestId?: string) {
    return this.cj.readiness();
  }
}
