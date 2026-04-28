import { Injectable } from '@nestjs/common';
import { MedusaService } from '../integrations/medusa/medusa.service';
import { SupabaseService } from '../integrations/supabase/supabase.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly medusaService: MedusaService,
  ) {}

  getHealth() {
    return {
      success: true,
      service: 'dbx-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getDeepHealth() {
    let supabase = false;
    let medusa = false;

    try {
      const client = this.supabaseService.getClient();
      const { error } = await client.from('system_logs').select('id').limit(1);
      supabase = !error;
    } catch {
      supabase = false;
    }

    try {
      await this.medusaService.listProducts({ limit: 1 });
      medusa = true;
    } catch {
      medusa = false;
    }

    return {
      success: supabase && medusa,
      service: 'dbx-api',
      status: supabase && medusa ? 'ok' : 'degraded',
      dependencies: {
        supabase,
        medusa,
      },
      timestamp: new Date().toISOString(),
    };
  }
}