import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CjProductImportDto } from "./dto/cj-supplier.dto";

@Injectable()
export class CjSupplierAdapterService {
  constructor(private readonly config: ConfigService) {}
  mapImport(input: CjProductImportDto) {
    const supplierCost = 1000;
    const retailPrice = Math.round(supplierCost * (1 + input.marginPct / 100));
    return { supplier: "cj", supplierProductId: input.cjProductId, sku: input.targetSku, supplierCost, retailPrice, metadata: { mapper: "price-margin-v1" } };
  }
  canSendLiveOrder() { return this.config.get<string>("SUPPLIER_LIVE_MODE") === "true"; }
}
