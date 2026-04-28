import { Body, Controller, Post } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('manual')
  createManual(@Body() dto: CreateCheckoutDto) {
    return this.checkoutService.createManualOrder(dto);
  }
}