import { Module } from "@nestjs/common";
import { SystemModule } from "../system/system.module";
import { WatchModule } from "../watch/watch.module";
import { AffiliateModule } from "../affiliate/affiliate.module";
import { PaymentsModule } from "../payments/payments.module";
import { AiStoriesModule } from "../ai-stories/ai-stories.module";
import { CommerceModule } from "../commerce/commerce.module";
import { WalletModule } from "../wallet/wallet.module";
import { PayoutsModule } from "../payouts/payouts.module";
import { SuppliersModule } from "../suppliers/suppliers.module";
import { AdsModule } from "../ads/ads.module";
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
    WalletModule,
    PayoutsModule,
    SuppliersModule,
    AdsModule,
  ],
  controllers: [PlatformShellController, PlatformAdminPackController],
  providers: [PlatformShellService, PlatformAdminPackService],
  exports: [
    PlatformShellService,
    PlatformAdminPackService,
    SystemModule,
    WatchModule,
    AffiliateModule,
    PaymentsModule,
    AiStoriesModule,
    CommerceModule,
    WalletModule,
    PayoutsModule,
    SuppliersModule,
    AdsModule,
  ],
})
export class PlatformModule {}
