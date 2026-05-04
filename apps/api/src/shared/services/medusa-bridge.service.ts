import { Injectable } from "@nestjs/common";
import {
  ManualOrderSyncPayload,
  MedusaBridgeHealth,
  MedusaOrderSummary,
  MedusaProductSummary,
} from "../contracts/medusa-bridge.contract";
import { MedusaHttpService } from "./medusa-http.service";

@Injectable()
export class MedusaBridgeService {
  constructor(private readonly medusaHttp: MedusaHttpService) {}

  async health(requestId?: string): Promise<MedusaBridgeHealth> {
    const blockers: string[] = [];

    let medusaReachable = false;
    try {
      await this.medusaHttp.get<{ products?: unknown[] }>(
        "/store/products?limit=1",
        {
          "x-request-id": requestId,
          "x-caller-surface": "health-check",
        },
        "store",
      );
      medusaReachable = true;
    } catch {
      blockers.push("medusa_unreachable");
    }

    const publishableKeyConfigured =
      this.medusaHttp.getPublishableKeyConfigured();
    const adminApiKeyConfigured = this.medusaHttp.getAdminApiKeyConfigured();

    if (!publishableKeyConfigured) blockers.push("medusa_publishable_key_missing");
    if (!adminApiKeyConfigured) blockers.push("medusa_admin_api_key_missing");

    return {
      ready:
        medusaReachable && publishableKeyConfigured && adminApiKeyConfigured,
      medusaReachable,
      publishableKeyConfigured,
      adminApiKeyConfigured,
      blockers,
    };
  }

  async listProducts(requestId?: string): Promise<MedusaProductSummary[]> {
    const response = await this.medusaHttp.get<{
      products?: MedusaProductSummary[];
    }>(
      "/admin/products?limit=50&fields=*variants,*variants.prices,*variants.calculated_price",
      {
        "x-request-id": requestId,
        "x-caller-surface": "catalog-sync",
      },
      "admin",
    );

    return response.products || [];
  }

  async getOrder(
    medusaOrderId: string,
    requestId?: string,
  ): Promise<MedusaOrderSummary | null> {
    const response = await this.medusaHttp.get<{ order?: MedusaOrderSummary }>(
      `/admin/orders/${medusaOrderId}`,
      {
        "x-request-id": requestId,
        "x-caller-surface": "order-sync",
      },
      "admin",
    );

    return response.order || null;
  }

  async syncManualOrder(
    payload: ManualOrderSyncPayload,
    requestId?: string,
  ): Promise<{
    success: true;
    syncMode: ManualOrderSyncPayload["syncMode"];
    medusaOrder: MedusaOrderSummary | null;
  }> {
    const order = await this.getOrder(payload.medusaOrderId, requestId);

    return {
      success: true,
      syncMode: payload.syncMode,
      medusaOrder: order,
    };
  }
}
