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
import { SettleSupplierOrderDto } from "./dto/settle-supplier-order.dto";
import { UpdateSupplierOrderStatusDto } from "./dto/update-supplier-order-status.dto";
import { SupplierLifecycleService } from "./supplier-lifecycle.service";

@ApiTags("supplier-lifecycle")
@Controller({
  path: "suppliers/orders",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SupplierLifecycleController {
  constructor(
    private readonly supplierLifecycle: SupplierLifecycleService,
  ) {}

  @Post("status")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal supplier order lifecycle status transition",
  })
  async updateStatus(
    @Body() body: UpdateSupplierOrderStatusDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.supplierLifecycle.updateStatus(body, requestId);
  }

  @Post("settle")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Internal supplier order settlement",
  })
  async settle(
    @Body() body: SettleSupplierOrderDto,
    @Headers("x-request-id") requestId?: string,
  ) {
    return this.supplierLifecycle.settle(body, requestId);
  }
}
