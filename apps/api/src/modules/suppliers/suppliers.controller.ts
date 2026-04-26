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
}
