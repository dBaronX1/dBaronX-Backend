import { Injectable } from "@nestjs/common";
import { AdsAdminService } from "../ads/ads-admin.service";
import { AiStoriesAdminService } from "../ai-stories/ai-stories-admin.service";
import { CommerceAdminService } from "../commerce/commerce-admin.service";
import { PaymentsAdminService } from "../payments/payments-admin.service";
import { PayoutsAdminService } from "../payouts/payouts-admin.service";
import { SupplierAdminService } from "../suppliers/supplier-admin.service";
import { WalletAdminService } from "../wallet/wallet-admin.service";

@Injectable()
export class SystemAdminSummaryService {
  constructor(
    private readonly walletAdmin: WalletAdminService,
    private readonly payoutsAdmin: PayoutsAdminService,
    private readonly paymentsAdmin: PaymentsAdminService,
    private readonly supplierAdmin: SupplierAdminService,
    private readonly adsAdmin: AdsAdminService,
    private readonly aiStoriesAdmin: AiStoriesAdminService,
    private readonly commerceAdmin: CommerceAdminService,
  ) {}

  async dashboard() {
    const [
      wallet,
      payouts,
      payments,
      suppliers,
      ads,
      aiStories,
      commerce,
    ] = await Promise.all([
      this.walletAdmin.dashboard(),
      this.payoutsAdmin.dashboard(),
      this.paymentsAdmin.dashboard(),
      this.supplierAdmin.dashboard(),
      this.adsAdmin.dashboard(),
      this.aiStoriesAdmin.dashboard(),
      this.commerceAdmin.dashboard(),
    ]);

    return {
      success: true,
      systemAdminSummary: {
        wallet: wallet.walletAdmin,
        payouts: payouts.payoutsAdmin,
        payments: payments.paymentsAdmin,
        suppliers: suppliers.supplierAdmin,
        ads: ads.adsAdmin,
        aiStories: aiStories.aiStoriesAdmin,
        commerce: commerce.commerceAdmin,
      },
    };
  }
}
