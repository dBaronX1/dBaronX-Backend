import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../integrations/supabase/supabase.service';

@Injectable()
export class OrdersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listOrders(limit = 20) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('manual_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new InternalServerErrorException(
        `Failed to fetch orders: ${error.message}`,
      );
    }

    return {
      success: true,
      count: data?.length ?? 0,
      orders: data ?? [],
    };
  }

  async getOrderById(id: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('manual_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Order not found');
    }

    return {
      success: true,
      order: data,
    };
  }

  async getOrderByReference(publicReference: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('manual_orders')
      .select('*')
      .eq('public_reference', publicReference)
      .single();

    if (error || !data) {
      throw new NotFoundException('Order not found');
    }

    return {
      success: true,
      order: data,
    };
  }
}