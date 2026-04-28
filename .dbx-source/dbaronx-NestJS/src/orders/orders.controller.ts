import { Controller, Get, Param, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  listOrders(@Query('limit') limit?: string) {
    return this.ordersService.listOrders(limit ? Number(limit) : 20);
  }

  @Get('reference/:publicReference')
  getOrderByReference(@Param('publicReference') publicReference: string) {
    return this.ordersService.getOrderByReference(publicReference);
  }

  @Get(':id')
  getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }
}