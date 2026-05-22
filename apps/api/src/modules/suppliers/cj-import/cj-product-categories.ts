export const CJ_PRODUCT_CATEGORIES = {
  all: "All",
  electronics: "Electronics",
  fashion: "Fashion",
  "home-living": "Home & Living",
  beauty: "Beauty",
  sports: "Sports",
  automotive: "Automotive",
  agriculture: "Agriculture",
  tech: "Tech",
  finance: "Finance",
} as const;

export type CjCategorySlug = keyof typeof CJ_PRODUCT_CATEGORIES;

export const RESTRICTED_KEYWORDS = [
  "weapon", "gun", "knife", "adult", "sex", "vape", "nicotine", "drug", "cbd", "supplement", "medical claim",
  "counterfeit", "replica", "hazardous", "explosive", "gambling", "spy", "surveillance", "stun", "taser",
];

export const RESTRICTED_FINANCE_KEYWORDS = ["loan", "credit repair", "forex signal", "gambling", "ponzi", "brokerage"]; 
