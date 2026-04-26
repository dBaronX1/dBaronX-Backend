import { Injectable } from "@nestjs/common";
import { MedusaVariantSummary } from "../contracts/medusa-bridge.contract";
import { MedusaHttpService } from "./medusa-http.service";

@Injectable()
export class MedusaVariantBridgeService {
  constructor(private readonly medusaHttp: MedusaHttpService) {}

  async listVariantsForProduct(
    medusaProductId: string,
    requestId?: string,
  ): Promise<MedusaVariantSummary[]> {
    const response = await this.medusaHttp.get<{
      product?: {
        id: string;
        variants?: MedusaVariantSummary[];
      };
    }>(
      `/admin/products/${medusaProductId}`,
      {
        "x-request-id": requestId,
        "x-caller-surface": "variant-sync",
      },
      "admin",
    );

    return response.product?.variants || [];
  }
}
