import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createRegionsWorkflow } from "@medusajs/medusa/core-flows";

type RegionRecord = { id: string; name?: string; currency_code?: string };

const DEFAULT_REGION_NAME = "dBaronX Global Launch Region";
const DEFAULT_CURRENCY_CODE = "usd";
const DEFAULT_COUNTRIES = ["gh", "ae", "us"];

async function safeQuery(query: any, entity: string, fields: string[]) {
  try {
    const result = await query.graph({ entity, fields, pagination: { take: 50 } });
    return Array.isArray(result?.data) ? result.data : [];
  } catch {
    return [];
  }
}

export default async function ensureRegion({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const existing = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
    pagination: { take: 50 },
  });

  const regions = (existing?.data || []) as RegionRecord[];
  const matchingRegion =
    regions.find((region) => region.name === DEFAULT_REGION_NAME) ||
    regions.find((region) => region.currency_code?.toLowerCase() === DEFAULT_CURRENCY_CODE) ||
    regions[0];

  const paymentProviders = await safeQuery(query, "payment_provider", ["id"]);
  const fulfillmentProviders = await safeQuery(query, "fulfillment_provider", ["id"]);

  const blockers: string[] = [];
  if (paymentProviders.length === 0) blockers.push("payment_provider_missing");
  if (fulfillmentProviders.length === 0) blockers.push("fulfillment_provider_missing");

  if (matchingRegion?.id) {
    console.log(
      JSON.stringify(
        {
          success: true,
          created: false,
          regionId: matchingRegion.id,
          currencyCode: matchingRegion.currency_code ?? DEFAULT_CURRENCY_CODE,
          blockers,
        },
        null,
        2
      )
    );
    return;
  }

  const created = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: DEFAULT_REGION_NAME,
          currency_code: DEFAULT_CURRENCY_CODE,
          countries: DEFAULT_COUNTRIES,
        },
      ],
    },
  });

  const createdRegion = created?.result?.[0] as RegionRecord | undefined;

  console.log(
    JSON.stringify(
      {
        success: true,
        created: true,
        regionId: createdRegion?.id ?? null,
        currencyCode: createdRegion?.currency_code ?? DEFAULT_CURRENCY_CODE,
        blockers,
      },
      null,
      2
    )
  );
}
