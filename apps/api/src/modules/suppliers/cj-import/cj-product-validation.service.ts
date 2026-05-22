import { Injectable } from "@nestjs/common";
import { RESTRICTED_KEYWORDS } from "./cj-product-categories";

export type CjValidationInput = {
  supplier: string;
  supplierProductId?: string | null;
  title?: string | null;
  handle?: string | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  priceMinor?: number | null;
  stockQty?: number | null;
  shippingCountries?: string[];
  deliveryEstimate?: string | null;
  checkoutReady?: boolean;
};

@Injectable()
export class CjProductValidationService {
  validate(input: CjValidationInput) {
    const blockers: string[] = [];
    const asText = `${input.title || ""} ${input.sourceUrl || ""}`.toLowerCase();
    if (input.supplier !== "cj") blockers.push("supplier_not_cj");
    if (!input.supplierProductId) blockers.push("supplier_product_id_missing");
    if (!input.title) blockers.push("title_missing");
    if (!input.handle) blockers.push("handle_missing");
    if (!input.imageUrl) blockers.push("image_missing");
    if (/(demo|mock|sample|test)/i.test(asText)) blockers.push("fake_readiness_blocked");
    if (RESTRICTED_KEYWORDS.some((k) => asText.includes(k))) blockers.push("restricted_product_risk");
    if (input.checkoutReady) {
      if (!input.priceMinor || input.priceMinor <= 0) blockers.push("price_missing_for_checkout");
      if (!input.stockQty || input.stockQty <= 0) blockers.push("stock_missing_for_checkout");
      if (!(input.shippingCountries || []).map((c) => c.toUpperCase()).includes("US")) blockers.push("us_shipping_required_for_launch");
      if (!input.deliveryEstimate) blockers.push("delivery_estimate_required_for_checkout");
    }
    return {
      valid: blockers.length === 0,
      validationStatus: blockers.length ? "validation_failed" : "validated",
      blockers,
    };
  }
}
