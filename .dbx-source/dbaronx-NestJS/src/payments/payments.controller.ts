import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { SubmitPaymentProofDto } from './dto/submit-payment-proof.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('intent')
  createIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(dto);
  }

  @Post('manual-proof')
  submitProof(@Body() dto: SubmitPaymentProofDto) {
    return this.paymentsService.submitPaymentProof(dto);
  }

  @Patch(':id/confirm')
  confirmPayment(@Param('id') id: string, @Body() dto: ConfirmPaymentDto) {
    return this.paymentsService.confirmPayment(id, dto);
  }
}