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
import { Public } from "../../shared/decorators/public.decorator";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { CjSupplierAdapterService } from "./adapters/cj/cj-supplier-adapter.service";
import { CjProductImportReadinessDto } from "./adapters/cj/dto/cj-supplier.dto";
import { CreateSupplierOrderDto } from "./dto/create-supplier-order.dto";
import { SupplierOrchestrationService } from "./supplier-orchestration.service";

@ApiTags("suppliers")
@Public()
@Controller({
  path: "suppliers",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SuppliersController {
  constructor(
    private readonly suppliers: SupplierOrchestrationService,
    private readonly cjSupplierAdapter: CjSupplierAdapterService,
  ) {}

  @Post("cj/import-readiness")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Prepare an explicit CJ product import metadata payload without importing catalog data",
  })
  prepareCjImportReadiness(@Body() body: CjProductImportReadinessDto) {
    return this.cjSupplierAdapter.prepareImportReadiness(body);
  }

  @Post("orders")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Internal supplier order orchestration with Medusa bridge sync",
  })
  async createOrder(
    @Body() body: CreateSupplierOrderDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.suppliers.createOrder(body, requestId);
  }
}
