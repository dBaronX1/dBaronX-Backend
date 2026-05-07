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
import { CjImportReadinessRequestDto } from "./adapters/cj/dto/cj-supplier.dto";
import { CjSupplierAdapterService } from "./adapters/cj/cj-supplier-adapter.service";
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
    summary: "Controlled CJ product import-readiness lookup without Medusa seeding",
  })
  async cjImportReadiness(
    @Body() body: CjImportReadinessRequestDto,
  ) {
    return this.cjSupplierAdapter.importReadiness(body);
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
