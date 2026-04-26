import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class EnvironmentContractService {
  constructor(private readonly configService: ConfigService) {}

  build() {
    const values = {
      appBaseUrl:
        this.configService.get<string>("app.baseUrl") ||
        process.env.APP_BASE_URL ||
        "",
      fastapiBaseUrl:
        this.configService.get<string>("fastapi.baseUrl") ||
        process.env.FASTAPI_BASE_URL ||
        "",
      internalServiceToken:
        this.configService.get<string>("fastapi.internalServiceToken") ||
        process.env.INTERNAL_SERVICE_TOKEN ||
        "",
      medusaBaseUrl:
        this.configService.get<string>("medusa.baseUrl") ||
        process.env.MEDUSA_BASE_URL ||
        "",
      medusaAdminApiKey:
        this.configService.get<string>("medusa.adminApiKey") ||
        process.env.MEDUSA_ADMIN_API_KEY ||
        "",
      medusaPublishableKey:
        this.configService.get<string>("medusa.publishableKey") ||
        process.env.MEDUSA_PUBLISHABLE_KEY ||
        "",
      supabaseUrl:
        this.configService.get<string>("supabase.url") ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        "",
      supabaseServiceRoleKey:
        this.configService.get<string>("supabase.serviceRoleKey") ||
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        "",
    };

    const missing = Object.entries(values)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    return {
      success: true,
      environmentContract: {
        valid: missing.length === 0,
        missing,
        configured: Object.fromEntries(
          Object.entries(values).map(([key, value]) => [key, Boolean(value)]),
        ),
      },
    };
  }
}
