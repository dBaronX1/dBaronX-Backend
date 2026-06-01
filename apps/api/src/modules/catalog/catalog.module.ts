import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MedusaHttpService } from "../../shared/services/medusa-http.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

@Module({
  imports: [ConfigModule],
  controllers: [CatalogController],
  providers: [CatalogService, MedusaHttpService, SupabaseService],
  exports: [CatalogService],
})
export class CatalogModule {}
