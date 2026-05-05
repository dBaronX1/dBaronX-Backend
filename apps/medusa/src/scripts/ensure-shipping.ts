import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createShippingProfilesWorkflow } from "@medusajs/medusa/core-flows";

const TARGET_REGION_ID = "reg_01KQSEKK6A9T86NJ0AG05XPK3H";
const DEFAULT_PROFILE_NAME = "Default Shipping Profile";
const DEFAULT_SHIPPING_OPTION_NAME = "dBaronX Standard Delivery";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asArray = <T = unknown>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

async function safeGraph(query: any, entity: string, fields: string[], filters?: Record<string, unknown>) {
  try {
    const result = await query.graph({ entity, fields, filters, pagination: { take: 50 } });
    return asArray(result?.data);
  } catch {
    return [];
  }
}

export default async function ensureShipping({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const blockers: string[] = [];

  const region = asArray(
    await safeGraph(query, "region", ["id", "name", "currency_code"], { id: TARGET_REGION_ID })
  )[0];
  const regionId = isRecord(region) && typeof region.id === "string" ? region.id : null;

  const profiles = await safeGraph(query, "shipping_profile", ["id", "name", "type"]);
  let shippingProfile: any = profiles.find((p: any) => p?.type === "default") || profiles.find((p: any) => p?.name === DEFAULT_PROFILE_NAME);
  let createdProfile = false;

  if (!shippingProfile?.id) {
    const created = await createShippingProfilesWorkflow(container).run({ input: { data: [{ name: DEFAULT_PROFILE_NAME, type: "default" }] } });
    shippingProfile = created.result?.[0] as any;
    createdProfile = true;
  }

  const fulfillmentProviders = await safeGraph(query, "fulfillment_provider", ["id"]);
  const serviceZones = await safeGraph(query, "service_zone", ["id", "name"]);

  const shippingOptions = await safeGraph(query, "shipping_option", ["id", "name", "region_id", "shipping_profile_id"]);
  let shippingOption: any = shippingOptions.find(
    (option: any) => option?.name === DEFAULT_SHIPPING_OPTION_NAME && (!regionId || option?.region_id === regionId)
  );

  let createdShippingOption = false;
  const createShippingOptionsWorkflow = (await import("@medusajs/medusa/core-flows")) as any;
  const createWorkflow = createShippingOptionsWorkflow?.createShippingOptionsWorkflow;

  const fulfillmentProviderReady = fulfillmentProviders.length > 0;

  if (!regionId) blockers.push("region_missing");
  if (!shippingProfile?.id) blockers.push("shipping_profile_missing");
  if (!fulfillmentProviderReady) blockers.push("fulfillment_provider_missing");
  if (serviceZones.length === 0) blockers.push("service_zone_missing");

  if (!shippingOption?.id && blockers.length === 0) {
    if (typeof createWorkflow !== "function") {
      blockers.push("shipping_option_workflow_unavailable");
    } else {
      const providerId = String((fulfillmentProviders[0] as any)?.id || "");
      const created = await createWorkflow(container).run({
        input: {
          data: [
            {
              name: DEFAULT_SHIPPING_OPTION_NAME,
              service_zone_id: (serviceZones[0] as any).id,
              shipping_profile_id: shippingProfile.id,
              provider_id: providerId,
              type: { label: "Standard", description: "Flat rate shipping" },
              price_type: "flat",
              prices: [{ currency_code: "usd", amount: 0 }],
              rules: [{ operator: "eq", attribute: "region_id", value: regionId }],
            },
          ],
        },
      });
      shippingOption = asArray(created?.result)[0];
      createdShippingOption = Boolean((shippingOption as any)?.id);
    }
  }

  const shippingOptionId = isRecord(shippingOption) && typeof shippingOption.id === "string" ? shippingOption.id : null;
  if (!shippingOptionId) blockers.push("shipping_option_missing");

  console.log(
    JSON.stringify(
      {
        success: blockers.length === 0,
        created: {
          shippingProfile: createdProfile,
          shippingOption: createdShippingOption,
        },
        existing: {
          shippingProfile: !createdProfile && Boolean(shippingProfile?.id),
          shippingOption: !createdShippingOption && Boolean(shippingOptionId),
        },
        blockers,
        regionId,
        shippingProfileId: shippingProfile?.id ?? null,
        shippingOptionId,
        fulfillmentProviderReady,
      },
      null,
      2
    )
  );
}
