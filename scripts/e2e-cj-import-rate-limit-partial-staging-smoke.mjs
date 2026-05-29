import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const operator = readFileSync(
  "apps/api/src/scripts/cj-operator-onboard-products.ts",
  "utf8",
);
const importer = readFileSync(
  "apps/api/src/modules/suppliers/cj-import/cj-product-import.service.ts",
  "utf8",
);
const combined = `${operator}\n${importer}`;

assert(
  importer.includes("async stageFetchedProducts("),
  "importer must expose staging for already fetched preview products",
);
assert(
  operator.includes("await importer.stageFetchedProducts("),
  "operator import must stage preview-fetched products without refetching them first",
);
assert(
  operator.indexOf("await importer.preview(category, requested)") <
    operator.indexOf("await importer.stageFetchedProducts("),
  "operator must preview/fetch before staging partial products",
);
assert(
  operator.includes("skipped_due_to_rate_limit"),
  "rate-limited category tail must be reported as skipped_due_to_rate_limit",
);
assert(
  operator.includes("cj_rate_limited"),
  "cj_rate_limited blocker must be preserved",
);
assert(
  operator.includes(
    "Wait 60-120 minutes, then rerun import for one category only, e.g. category=fashion limitPerCategory=2.",
  ),
  "rate-limit nextAction must recommend a 60-120 minute wait and one-category import",
);
assert(
  operator.includes("result.totalFetched > 0") &&
    operator.includes("result.totalStaged === 0"),
  "operator must guard fetched>0/staged=0 rate-limit outputs",
);
for (const blocker of [
  "fetched_products_not_staged_due_to_rate_limit_boundary",
  "staging_insert_failed",
  "validation_rejected_all_products",
  "missing_required_product_fields",
  "duplicate_all_items",
]) {
  assert(
    combined.includes(blocker),
    `missing exact non-generic zero-staged blocker: ${blocker}`,
  );
}

const forbiddenSecretPatterns = [
  /DATABASE_URL=.*[A-Za-z0-9]/,
  /MEDUSA_DATABASE_URL=.*[A-Za-z0-9]/,
  /CJ_ACCESS_TOKEN=.*[A-Za-z0-9]/,
  /CJ_API_KEY=.*[A-Za-z0-9]/,
  /JWT_SECRET=.*[A-Za-z0-9]/,
  /COOKIE_SECRET=.*[A-Za-z0-9]/,
];
for (const pattern of forbiddenSecretPatterns) {
  assert(
    !pattern.test(combined),
    `source appears to print or hardcode a secret pattern: ${pattern}`,
  );
}

console.log(
  JSON.stringify(
    { success: true, smoke: "cj_import_rate_limit_partial_staging" },
    null,
    2,
  ),
);
