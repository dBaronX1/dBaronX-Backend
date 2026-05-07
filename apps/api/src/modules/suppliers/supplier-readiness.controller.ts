import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../shared/decorators/public.decorator";
import { SupplierReadinessService } from "./supplier-readiness.service";

@ApiTags("supplier-readiness")
@Controller({
  path: "suppliers/readiness",
  version: VERSION_NEUTRAL,
})
export class SupplierReadinessController {
  constructor(private readonly supplierReadiness: SupplierReadinessService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: "Server-only supplier credential readiness without secret exposure",
  })
  getReadiness() {
    return this.supplierReadiness.getReadiness();
  }
}
