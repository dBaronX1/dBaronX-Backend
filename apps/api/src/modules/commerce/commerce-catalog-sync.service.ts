import { Injectable } from "@nestjs/common";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { MedusaBridgeService } from "../../shared/services/medusa-bridge.service";

@Injectable()
export class CommerceCatalogSyncService {
  constructor(
    private readonly medusaBridge: MedusaBridgeService,
    private readonly launchReadinessPersistence: LaunchReadinessPersistenceService,
  ) {}

  async syncPreview(requestId?: string) {
    const products = await this.medusaBridge.listProducts(requestId);

    await this.launchReadinessPersistence.persist({
      requestId,
      source: "commerce-catalog-sync",
      status: "ready",
      payload: {
        productCount: products.length,
        sampleProductIds: products.slice(0, 10).map((item) => item.id),
      },
    });

    return {
      success: true,
      catalogSync: {
        productCount: products.length,
        products,
      },
    };
  }
}
