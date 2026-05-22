import { Injectable } from "@nestjs/common";
import { CJ_PRODUCT_CATEGORIES, CjCategorySlug, RESTRICTED_FINANCE_KEYWORDS, RESTRICTED_KEYWORDS } from "./cj-product-categories";

@Injectable()
export class CjProductCategoryMapperService {
  map(input: { category?: string | null; title?: string | null; description?: string | null }) {
    const text = `${input.category || ""} ${input.title || ""} ${input.description || ""}`.toLowerCase();
    const blockers: string[] = [];

    if (RESTRICTED_KEYWORDS.some((k) => text.includes(k))) {
      return { category: CJ_PRODUCT_CATEGORIES.all, categorySlug: "all" as CjCategorySlug, blocked: true, blockers: ["restricted_category"] };
    }

    const map: Array<[CjCategorySlug, string[]]> = [
      ["electronics", ["electronic", "phone", "tablet", "audio", "charger"]],
      ["fashion", ["fashion", "shirt", "dress", "shoe", "jacket"]],
      ["home-living", ["home", "kitchen", "decor", "living"]],
      ["beauty", ["beauty", "cosmetic", "skincare", "makeup"]],
      ["sports", ["sport", "fitness", "gym", "yoga"]],
      ["automotive", ["automotive", "car", "vehicle", "motor"]],
      ["agriculture", ["agriculture", "farming", "seed", "garden tool"]],
      ["tech", ["tech", "gadget", "device", "smart"]],
      ["finance", ["finance", "accounting", "ledger", "calculator"]],
    ];

    for (const [slug, keys] of map) {
      if (keys.some((k) => text.includes(k))) {
        if (slug === "finance" && RESTRICTED_FINANCE_KEYWORDS.some((k) => text.includes(k))) {
          return { category: CJ_PRODUCT_CATEGORIES.all, categorySlug: "all" as CjCategorySlug, blocked: true, blockers: ["restricted_category"] };
        }
        return { category: CJ_PRODUCT_CATEGORIES[slug], categorySlug: slug, blocked: false, blockers };
      }
    }

    blockers.push("uncategorized_review");
    return { category: CJ_PRODUCT_CATEGORIES.all, categorySlug: "all" as CjCategorySlug, blocked: false, blockers };
  }
}
