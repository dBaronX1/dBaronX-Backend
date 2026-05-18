import { Controller, Get, Param, Query, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../shared/decorators/public.decorator";
import { StorefrontProductsService } from "./storefront-products.service";

@ApiTags("storefront-products")
@Public()
@Controller({
  path: "storefront/products",
  version: VERSION_NEUTRAL,
})
export class StorefrontProductsController {
  constructor(private readonly storefrontProducts: StorefrontProductsService) {}

  @Get()
  @ApiOperation({ summary: "Public verified Supabase storefront products" })
  list(@Query("limit") limit?: string, @Query("handle") handle?: string) {
    return this.storefrontProducts.list({ limit: Number(limit || 24) || 24, handle: handle?.trim() || undefined });
  }

  @Get(":handle")
  @ApiOperation({ summary: "Public verified Supabase storefront product by handle" })
  byHandle(@Param("handle") handle: string, @Query("limit") limit?: string) {
    return this.storefrontProducts.list({ limit: Number(limit || 5) || 5, handle: decodeURIComponent(handle || "").trim() });
  }
}
