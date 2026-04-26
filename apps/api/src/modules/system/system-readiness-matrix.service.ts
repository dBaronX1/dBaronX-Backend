import { Injectable } from "@nestjs/common";
import { AdsAdminService } from "../ads/ads-admin.service";
import { AiStoriesAdminService } from "../ai-stories/ai-stories-admin.service";
import { CommerceHealthService } from "../commerce/commerce-health.service";
import { PaymentsAdminService } from "../payments/payments-admin.service";
import { PayoutsAdminService } from "../payouts/payouts-admin.service";
import { SupplierAdminService } from "../suppliers/supplier-admin.service";
import { WalletAdminService } from "../wallet/wallet-admin.service";
import { SystemLaunchClosureService } from "./system-launch-closure.service";

@Injectable()
export class SystemReadinessMatrixService {
  constructor(
    private readonly walletAdmin: WalletAdminService,
    private readonly payoutsAdmin: PayoutsAdminService,
    private readonly paymentsAdmin: PaymentsAdminService,
    private readonly supplierAdmin: SupplierAdminService,
    private readonly adsAdmin: AdsAdminService,
    private readonly aiStoriesAdmin: AiStoriesAdminService,
    private readonly commerceHealth: CommerceHealthService,
    private readonly launchClosure: SystemLaunchClosureService,
  ) {}

  async build(requestId?: string) {
    const [
      wallet,
      payouts,
      payments,
      suppliers,
      ads,
      aiStories,
      commerce,
      closure,
    ] = await Promise.all([
      this.walletAdmin.dashboard(),
      this.payoutsAdmin.dashboard(),
      this.paymentsAdmin.dashboard(),
      this.supplierAdmin.dashboard(),
      this.adsAdmin.dashboard(),
      this.aiStoriesAdmin.dashboard(),
      this.commerceHealth.snapshot(requestId),
      this.launchClosure.build(requestId),
    ]);

    const matrix = {
      wallet: {
        ready: wallet.walletAdmin.walletCount >= 0,
        summary: {
          holdCount: wallet.walletAdmin.holdCount,
          ledgerEntryCount: wallet.walletAdmin.ledgerEntryCount,
        },
      },
      payouts: {
        ready: true,
        summary: {
          totalPayoutRequests: payouts.payoutsAdmin.totalPayoutRequests,
          statusCounts: payouts.payoutsAdmin.statusCounts,
        },
      },
      payments: {
        ready: true,
        summary: {
          checkoutSettlementCount: payments.paymentsAdmin.checkoutSettlementCount,
        },
      },
      suppliers: {
        ready: true,
        summary: {
          totalOrders: suppliers.supplierAdmin.totalOrders,
          settlementCounts: suppliers.supplierAdmin.settlementCounts,
        },
      },
      ads: {
        ready: true,
        summary: {
          totalCampaigns: ads.adsAdmin.totalCampaigns,
          statusCounts: ads.adsAdmin.statusCounts,
        },
      },
      aiStories: {
        ready: true,
        summary: {
          totalCampaigns: aiStories.aiStoriesAdmin.totalCampaigns,
          totalStories: aiStories.aiStoriesAdmin.totalStories,
        },
      },
      commerce: {
        ready: commerce.commerceHealth.status === "ready",
        summary: commerce.commerceHealth,
      },
      launchClosure: {
        ready: closure.launchClosure.ready,
        summary: {
          blockers: closure.launchClosure.blockers,
        },
      },
    };

    return {
      success: true,
      readinessMatrix: matrix,
    };
  }
}
