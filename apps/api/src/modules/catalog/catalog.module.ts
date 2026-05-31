import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MedusaHttpService } from "../../shared/services/medusa-http.service";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

@Module({
  imports: [ConfigModule],
  controllers: [CatalogController],
  providers: [CatalogService, MedusaHttpService],
  exports: [CatalogService],
})
export class CatalogModule {}
