import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../integrations/supabase/supabase.service';
import { TelegramService } from '../integrations/telegram/telegram.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { generatePublicReference } from '../common/utils/generate-public-reference';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly telegramService: TelegramService,
  ) {}

  async createManualOrder(dto: CreateCheckoutDto) {
    const client = this.supabaseService.getClient();
    const publicReference = generatePublicReference('MO');

    const payload = {
      public_reference: publicReference,
      medusa_order_id: null,

      customer_name: dto.customer_name,
      customer_email: dto.customer_email ?? null,
      customer_phone: dto.customer_phone ?? null,

      country: dto.country,
      address_line_1: dto.address_line_1,
      address_line_2: dto.address_line_2 ?? null,
      city: dto.city ?? null,
      postal_code: dto.postal_code ?? null,

      items: dto.items ?? [],
      product_snapshot: dto.items ?? [],

      subtotal: dto.total_amount,
      shipping_amount: 0,
      total_amount: dto.total_amount,
      currency: (dto.currency || 'USD').toUpperCase(),

      payment_status: 'pending',
      fulfillment_status: 'pending',
      supplier_status: 'pending',
      operational_status: 'new',
      payment_method: 'manual',

      notes: null,
      source: dto.source || 'website',
      status: 'pending',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('manual_orders')
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      throw new InternalServerErrorException(
        `Failed to create manual order: ${error?.message || 'unknown error'}`,
      );
    }

    await this.telegramService.sendAdminAlert(
      [
        '🛒 <b>New Manual Order</b>',
        `Ref: <code>${publicReference}</code>`,
        `Customer: ${dto.customer_name}`,
        `Email: ${dto.customer_email || '-'}`,
        `Phone: ${dto.customer_phone || '-'}`,
        `Country: ${dto.country}`,
        `Total: ${dto.total_amount} ${(dto.currency || 'USD').toUpperCase()}`,
        `Items: ${dto.items.length}`,
      ].join('\n'),
    );

    return {
      success: true,
      order: data,
    };
  }
}