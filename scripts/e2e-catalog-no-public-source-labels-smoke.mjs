#!/usr/bin/env node
import { read, assert } from "./e2e-production-lock-helpers.mjs";
const catalog = read("apps/api/src/modules/catalog/catalog.service.ts");
const types = read("apps/api/src/modules/catalog/catalog.types.ts");
const forbiddenPublic =
  /supplier:\s*supplier|supplier:\s*["']cj["']|sourceUrl:\s*text|publicLabels:\s*\[[^\]]*(CJ|Medusa|Supabase|FastAPI|NestJS|Rocket|Render|GitHub|Kickstarter|Indiegogo)/i;
assert(
  catalog.includes("safePublicText"),
  "catalog must sanitize public metadata text",
);
assert(
  catalog.includes('supplier: "Verified Supplier"'),
  "catalog supplier field must be customer-safe",
);
assert(
  catalog.includes('sourceUrl: ""'),
  "catalog must not expose supplier source URLs publicly",
);
assert(
  catalog.includes("publicLabels") &&
    catalog.includes('"Verified Supplier"') &&
    catalog.includes('"Direct Shipping"') &&
    catalog.includes('"Global Supplier"'),
  "catalog labels must use customer-safe supplier wording",
);
assert(
  !forbiddenPublic.test(catalog),
  "catalog normalizer exposes forbidden supplier/source labels publicly",
);
assert(
  /SECRET_FIELD_PATTERN[\s\S]*cost\|supplier/.test(catalog),
  "catalog must filter costs/internal supplier metadata",
);
assert(
  types.includes("metadataPublic"),
  "catalog response must keep a filtered metadataPublic contract",
);
console.log("catalog no public source labels smoke passed");
