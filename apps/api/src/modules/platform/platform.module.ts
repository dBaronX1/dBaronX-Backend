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
  exports: [
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
