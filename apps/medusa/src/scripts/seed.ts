import { ExecArgs } from "@medusajs/framework/types";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function seed({ container }: ExecArgs) {
  const salesChannels = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        {
          name: "dBaronX Default Sales Channel",
          description: "Default sales channel for dBaronX storefront",
        },
      ],
    },
  });

  const salesChannel = salesChannels.result[0];

  const stockLocations = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: "dBaronX Main Warehouse",
          address: {
            address_1: "Dubai Main Fulfillment",
            city: "Dubai",
            country_code: "AE",
          },
        },
      ],
    },
  });

  const stockLocation = stockLocations.result[0];

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      links: [
        {
          sales_channel_id: salesChannel.id,
          stock_location_id: stockLocation.id,
        },
      ],
    },
  });

  const shippingProfiles = await createShippingProfilesWorkflow(container).run({
    input: {
      data: [
        {
          name: "Default Shipping Profile",
          type: "default",
        },
      ],
    },
  });

  const shippingProfile = shippingProfiles.result[0];

  const regions = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Global Default Region",
          currency_code: "usd",
          countries: ["us", "ae", "gb", "ca", "gh"],
          payment_providers: ["pp_system_default"],
          fulfillment_providers: ["manual_manual"],
        },
      ],
    },
  });

  const region = regions.result[0];

  await updateStoresWorkflow(container).run({
    input: {
      selector: {},
      update: {
        default_sales_channel_id: salesChannel.id,
        default_region_id: region.id,
        supported_currencies: [
          { currency_code: "usd", is_default: true },
          { currency_code: "aed" },
          { currency_code: "gbp" },
        ],
      },
    },
  });

  const createdProducts = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "dBaronX Eco Bottle",
          subtitle: "Premium reusable hydration bottle",
          handle: "dbaronx-eco-bottle",
          description:
            "A durable reusable eco bottle built for daily use, travel, and healthy hydration.",
          status: "published",
          sales_channels: [{ id: salesChannel.id }],
          shipping_profile_id: shippingProfile.id,
          type: { value: "Home & Living" },
          tags: [{ value: "eco" }, { value: "bottle" }, { value: "lifestyle" }],
          options: [{ title: "Size", values: ["Standard"] }],
          variants: [
            {
              title: "Standard",
              sku: "DBX-BOTTLE-001",
              manage_inventory: true,
              prices: [{ amount: 2500, currency_code: "usd" }],
              options: { Size: "Standard" },
            },
          ],
        },
        {
          title: "dBaronX Organic Soap",
          subtitle: "Natural skin care essential",
          handle: "dbaronx-organic-soap",
          description:
            "Organic soap made for gentle daily cleansing with a natural, premium feel.",
          status: "published",
          sales_channels: [{ id: salesChannel.id }],
          shipping_profile_id: shippingProfile.id,
          type: { value: "Beauty" },
          tags: [{ value: "soap" }, { value: "organic" }, { value: "skincare" }],
          options: [{ title: "Type", values: ["Classic"] }],
          variants: [
            {
              title: "Classic",
              sku: "DBX-SOAP-001",
              manage_inventory: true,
              prices: [{ amount: 1200, currency_code: "usd" }],
              options: { Type: "Classic" },
            },
          ],
        },
        {
          title: "dBaronX Performance T-Shirt",
          subtitle: "Clean premium everyday wear",
          handle: "dbaronx-performance-tshirt",
          description:
            "Premium t-shirt designed for comfort, flexibility, and everyday lifestyle use.",
          status: "published",
          sales_channels: [{ id: salesChannel.id }],
          shipping_profile_id: shippingProfile.id,
          type: { value: "Fashion" },
          tags: [{ value: "fashion" }, { value: "tshirt" }, { value: "premium" }],
          options: [{ title: "Size", values: ["M"] }],
          variants: [
            {
              title: "M",
              sku: "DBX-TSHIRT-001",
              manage_inventory: true,
              prices: [{ amount: 3500, currency_code: "usd" }],
              options: { Size: "M" },
            },
          ],
        },
      ],
    },
  });

  const products = createdProducts.result;

  const inventoryLevels = products
    .flatMap((product: any) =>
      (product.variants || []).map((variant: any) => ({
        inventory_item_id: variant.inventory_items?.[0]?.id,
        location_id: stockLocation.id,
        stocked_quantity: 100,
      }))
    )
    .filter((x: any) => x.inventory_item_id);

  if (inventoryLevels.length > 0) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: inventoryLevels,
      },
    });
  }

  const apiKeys = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: "dBaronX Storefront Publishable Key",
          type: "publishable",
          created_by: "seed-script",
        },
      ],
    },
  });

  const publishableKey = apiKeys.result[0];

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      links: [
        {
          api_key_id: publishableKey.id,
          sales_channel_id: salesChannel.id,
        },
      ],
    },
  });

  console.log("✅ dBaronX seed complete");
  console.log("🔑 Publishable API Key:", publishableKey.token);
  console.log(
    "📦 Products:",
    products.map((p: any) => ({
      id: p.id,
      title: p.title,
      handle: p.handle,
    }))
  );
}