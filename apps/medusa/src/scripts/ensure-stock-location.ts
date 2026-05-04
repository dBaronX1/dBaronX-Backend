import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createStockLocationsWorkflow } from "@medusajs/medusa/core-flows";

type StockLocationRecord = { id: string; name?: string };

const DEFAULT_STOCK_LOCATION_NAME = "dBaronX Default Stock Location";

export default async function ensureStockLocation({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const existing = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
    pagination: { take: 20 },
  });

  const stockLocations = (existing.data || []) as StockLocationRecord[];

  if (stockLocations.length > 0) {
    const stockLocation =
      stockLocations.find((location) => location.name === DEFAULT_STOCK_LOCATION_NAME) ||
      stockLocations[0];

    console.log(
      JSON.stringify(
        {
          success: true,
          created: false,
          stockLocationId: stockLocation.id,
          name: stockLocation.name ?? null,
        },
        null,
        2
      )
    );
    return;
  }

  const created = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: DEFAULT_STOCK_LOCATION_NAME,
          address: {
            address_1: "dBaronX Fulfillment Hub",
            city: "Accra",
            country_code: "gh",
          },
        },
      ],
    },
  });

  const stockLocation = created.result[0] as StockLocationRecord | undefined;

  console.log(
    JSON.stringify(
      {
        success: true,
        created: true,
        stockLocationId: stockLocation?.id ?? null,
        name: stockLocation?.name ?? DEFAULT_STOCK_LOCATION_NAME,
      },
      null,
      2
    )
  );
}
