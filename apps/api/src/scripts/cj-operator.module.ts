import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseService } from '../shared/services/supabase.service';
import { CjSupplierAdapterService } from '../modules/suppliers/adapters/cj/cj-supplier-adapter.service';
import { CjProductCategoryMapperService } from '../modules/suppliers/cj-import/cj-product-category-mapper.service';
import { CjProductValidationService } from '../modules/suppliers/cj-import/cj-product-validation.service';
import { CjProductImportService } from '../modules/suppliers/cj-import/cj-product-import.service';
import { CjProductPublishService } from '../modules/suppliers/cj-import/cj-product-publish.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
    }),
  ],
  providers: [
    SupabaseService,
    CjSupplierAdapterService,
    CjProductCategoryMapperService,
    CjProductValidationService,
    CjProductImportService,
    CjProductPublishService,
  ],
  exports: [CjProductImportService, CjProductPublishService],
})
export class CjOperatorModule {}
