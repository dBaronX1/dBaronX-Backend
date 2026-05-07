import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../shared/decorators/public.decorator";
import { SupplierReadinessService } from "./supplier-readiness.service";

@ApiTags("supplier-readiness")
@Public()
@Controller({
  path: "suppliers/readiness",
  version: VERSION_NEUTRAL,
})
export class SupplierReadinessController {
  constructor(private readonly supplierReadiness: SupplierReadinessService) {}

  @Get()
  @ApiOperation({
    summary: "Supplier credential and CJ live-probe readiness without returning secrets",
  })
  async getReadiness() {
    return this.supplierReadiness.getReadiness();
  }
}
