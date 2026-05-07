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
import { CjSupplierAdapterService } from "./adapters/cj/cj-supplier-adapter.service";
import { CjProductImportReadinessDto } from "./adapters/cj/dto/cj-supplier.dto";
import { CreateSupplierOrderDto } from "./dto/create-supplier-order.dto";
import { SupplierOrchestrationService } from "./supplier-orchestration.service";

@ApiTags("suppliers")
@Controller({
  path: "suppliers",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SuppliersController {
  constructor(
    private readonly suppliers: SupplierOrchestrationService,
    private readonly cj: CjSupplierAdapterService,
  ) {}

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

  @Post("cj/import-readiness")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Prepare normalized CJ supplier metadata for an explicit product without importing a catalog",
  })
  async prepareCjImport(@Body() body: CjProductImportReadinessDto) {
    return this.cj.prepareProductImport(body);
  }
}
