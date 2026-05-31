import { Module } from "@nestjs/common";
import { SystemModule } from "../system/system.module";
import { SystemAdminEndpointRegistryService } from "../system/system-admin-endpoint-registry.service";
import { WatchModule } from "../watch/watch.module";
import { AffiliateModule } from "../affiliate/affiliate.module";
import { PaymentsModule } from "../payments/payments.module";
import { AiStoriesModule } from "../ai-stories/ai-stories.module";
import { CommerceModule } from "../commerce/commerce.module";
import { CatalogModule } from "../catalog/catalog.module";
import { WalletModule } from "../wallet/wallet.module";
import { PayoutsModule } from "../payouts/payouts.module";
import { SuppliersModule } from "../suppliers/suppliers.module";
import { AdsModule } from "../ads/ads.module";
import { AuthModule } from "../auth/auth.module";
import { PlatformAdminPackController } from "./platform-admin-pack.controller";
import { PlatformAdminPackService } from "./platform-admin-pack.service";
import { PlatformShellController } from "./platform-shell.controller";
import { PlatformShellService } from "./platform-shell.service";

@Module({
  imports: [
    SystemModule,
    WatchModule,
    AffiliateModule,
    PaymentsModule,
    AiStoriesModule,
    CommerceModule,
    CatalogModule,
    WalletModule,
    PayoutsModule,
    SuppliersModule,
    AdsModule,
    AuthModule,
  ],
  controllers: [PlatformShellController, PlatformAdminPackController],
  providers: [
    PlatformShellService,
    PlatformAdminPackService,
    SystemAdminEndpointRegistryService,
  ],
  exports: [
    PlatformShellService,
    PlatformAdminPackService,
    SystemModule,
    WatchModule,
    AffiliateModule,
    PaymentsModule,
    AiStoriesModule,
    CommerceModule,
    CatalogModule,
    WalletModule,
    PayoutsModule,
    SuppliersModule,
    AdsModule,
    AuthModule,
  ],
})
export class PlatformModule {}
