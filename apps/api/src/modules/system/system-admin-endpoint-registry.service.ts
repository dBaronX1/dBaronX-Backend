import { Injectable } from "@nestjs/common";

@Injectable()
export class SystemAdminEndpointRegistryService {
  build() {
    return {
      success: true,
      adminEndpointRegistry: {
        system: [
          "/api/v1/system/admin-ops/dashboard",
          "/api/v1/system/admin-summary/dashboard",
          "/api/v1/system/admin-action-pack",
          "/api/v1/system/admin-actions/recheck-all",
          "/api/v1/system/admin-actions/clear-startup-audit",
          "/api/v1/system/launch-audit-trail",
          "/api/v1/system/readiness-matrix",
          "/api/v1/system/shell-closure",
          "/api/v1/system/operations-handoff",
        ],
        wallet: ["/api/v1/wallet/admin/dashboard"],
        payouts: [
          "/api/v1/payouts/admin/dashboard",
          "/api/v1/payouts/review-queue",
        ],
        payments: ["/api/v1/payments/admin/dashboard"],
        suppliers: ["/api/v1/suppliers/admin/dashboard"],
        ads: [
          "/api/v1/ads/admin/dashboard",
          "/api/v1/ads/review/queue",
        ],
        aiStories: [
          "/api/v1/ai-stories/admin/dashboard",
          "/api/v1/ai-stories/review/queue",
        ],
        commerce: [
          "/api/v1/commerce/admin/dashboard",
          "/api/v1/commerce/boundary-audit",
        ],
      },
    };
  }
}
