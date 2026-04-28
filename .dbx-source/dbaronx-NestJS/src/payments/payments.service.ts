import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../integrations/supabase/supabase.service';
import { TelegramService } from '../integrations/telegram/telegram.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { SubmitPaymentProofDto } from './dto/submit-payment-proof.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly telegramService: TelegramService,
  ) {}

  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    const client = this.supabaseService.getClient();
    const order = await this.resolveOrder(dto.manual_order_id, dto.public_reference);

    const { data, error } = await client
      .from('payment_records')
      .insert({
        manual_order_id: order.id,
        provider: dto.provider,
        provider_reference: dto.provider_reference ?? null,
        amount: dto.amount,
        currency: (dto.currency || order.currency || 'USD').toUpperCase(),
        payment_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new InternalServerErrorException(
        `Failed to create payment record: ${error?.message || 'unknown error'}`,
      );
    }

    return {
      success: true,
      payment: data,
    };
  }

  async submitPaymentProof(dto: SubmitPaymentProofDto) {
    const client = this.supabaseService.getClient();
    const order = await this.resolveOrder(dto.manual_order_id, dto.public_reference);

    const { data, error } = await client
      .from('payment_records')
      .insert({
        manual_order_id: order.id,
        provider: dto.provider,
        provider_reference: dto.provider_reference ?? null,
        amount: order.total_amount,
        currency: order.currency || 'USD',
        payment_status: 'proof_submitted',
        proof_url: dto.proof_url ?? null,
        payer_name: dto.payer_name ?? null,
        payer_email: dto.payer_email ?? null,
        metadata: {},
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new InternalServerErrorException(
        `Failed to submit payment proof: ${error?.message || 'unknown error'}`,
      );
    }

    await client
      .from('manual_orders')
      .update({
        payment_status: 'proof_submitted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    await this.telegramService.sendAdminAlert(
      [
        '💳 <b>Payment Proof Submitted</b>',
        `Ref: <code>${order.public_reference}</code>`,
        `Provider: ${dto.provider}`,
        `Amount: ${order.total_amount} ${order.currency}`,
        `Proof: ${dto.proof_url || '-'}`,
      ].join('\n'),
    );

    return {
      success: true,
      payment: data,
    };
  }

  async confirmPayment(id: string, dto: ConfirmPaymentDto) {
    const client = this.supabaseService.getClient();

    const { data: payment, error: paymentError } = await client
      .from('payment_records')
      .select('*')
      .eq('id', id)
      .single();

    if (paymentError || !payment) {
      throw new NotFoundException('Payment record not found');
    }

    const { data: updatedPayment, error: updatePaymentError } = await client
      .from('payment_records')
      .update({
        payment_status: 'confirmed',
        metadata: {
          ...(payment.metadata || {}),
          confirmed_by: dto.confirmed_by || 'admin',
          note: dto.note || null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updatePaymentError || !updatedPayment) {
      throw new InternalServerErrorException(
        `Failed to confirm payment: ${updatePaymentError?.message || 'unknown error'}`,
      );
    }

    if (!payment.manual_order_id) {
      throw new BadRequestException('Payment record is not linked to an order');
    }

    await client
      .from('manual_orders')
      .update({
        payment_status: 'confirmed',
        operational_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.manual_order_id);

    return {
      success: true,
      payment: updatedPayment,
    };
  }

  private async resolveOrder(manualOrderId?: string, publicReference?: string) {
    const client = this.supabaseService.getClient();

    if (!manualOrderId && !publicReference) {
      throw new BadRequestException('manual_order_id or public_reference is required');
    }

    let query = client.from('manual_orders').select('*');

    if (manualOrderId) {
      query = query.eq('id', manualOrderId);
    } else {
      query = query.eq('public_reference', publicReference as string);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      throw new NotFoundException('Order not found');
    }

    return data;
  }
}