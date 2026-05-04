import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createRegionsWorkflow, updateStoresWorkflow } from "@medusajs/medusa/core-flows";

const DEFAULT_REGION_NAME = "dBaronX Launch Region";
const DEFAULT_CURRENCY = "usd";
const DEFAULT_COUNTRIES = ["us"];

export default async function ensureRegion({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const blockers: string[] = [];

  const existingRegions = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
    pagination: { take: 50 },
  });

  const region =
    (existingRegions.data || []).find((entry: any) => entry?.name === DEFAULT_REGION_NAME) ||
    (existingRegions.data || []).find((entry: any) => String(entry?.currency_code || "").toLowerCase() === DEFAULT_CURRENCY);

  let regionId = region?.id as string | undefined;
  let created = false;

  if (!regionId) {
    const createdRegion = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: DEFAULT_REGION_NAME,
            currency_code: DEFAULT_CURRENCY,
            countries: DEFAULT_COUNTRIES,
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    });

    regionId = createdRegion.result?.[0]?.id;
    created = true;
  }

  if (!regionId) blockers.push("region_missing");

  if (regionId) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: {},
        update: {
          default_region_id: regionId,
          supported_currencies: [{ currency_code: DEFAULT_CURRENCY, is_default: true }],
        },
      },
    });
  }

  console.log(JSON.stringify({ success: blockers.length === 0, created, existing: !created, blockers, regionId: regionId ?? null }, null, 2));
}
