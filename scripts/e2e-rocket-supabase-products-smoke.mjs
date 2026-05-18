#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";

const checks = [];
function check(name, pass) {
  checks.push({ name, pass });
}
function fileHas(file, patterns) {
  if (!existsSync(file)) return false;
  const text = readFileSync(file, "utf8");
  return patterns.every((pattern) => (pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern)));
}

check("storefront product list route exists", existsSync("apps/web/src/app/api/storefront/products/route.ts"));
check("storefront product handle route exists", existsSync("apps/web/src/app/api/storefront/products/[handle]/route.ts"));
check("Supabase product helper exists", fileHas("apps/web/src/lib/supabase-products.ts", ["app_public", "storefront_products", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]));
check("Supabase product hook exists", fileHas("apps/web/src/lib/hooks/useSupabaseProducts.ts", ["useSupabaseProducts", "fetchMedusaStoreProducts"]));
check("home uses Supabase-backed store products", fileHas("apps/web/src/components/dbx/StaticPages.tsx", ["fetchRocketStoreProducts", "DbxHomePage"]));
check("shop uses Supabase-backed store products", fileHas("apps/web/src/app/shop/page.tsx", ["DbxShopPage"]));
check("products uses Supabase-backed store products", fileHas("apps/web/src/app/(platform)/products/page.tsx", ["DbxShopPage"]));
check("product handle uses handle", fileHas("apps/web/src/app/(platform)/products/[handle]/page.tsx", ["handle", "DbxShopPage"]));
check("store priority is Supabase first", fileHas("apps/web/src/lib/store-products-server.ts", ["fetchSupabaseStorefrontProducts", /return supabase[;\s]/]));
check("no fake checkout without variant", fileHas("apps/web/src/components/dbx/ProductViews.tsx", ["Unavailable for checkout", "variantId ?", "data-default-variant-id=\"\""]));
check("client code only references public Supabase env", fileHas("apps/web/src/lib/supabase-products.ts", ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) && !fileHas("apps/web/src/lib/supabase-products.ts", [/SERVICE_ROLE|CJ_ACCESS_TOKEN|STRIPE_SECRET|DATABASE_URL/]));

const failed = checks.filter((item) => !item.pass);
console.log(JSON.stringify({ success: failed.length === 0, checks, failed }, null, 2));
if (failed.length) process.exit(1);
