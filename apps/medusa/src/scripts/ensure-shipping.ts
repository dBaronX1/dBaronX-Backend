import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createShippingProfilesWorkflow } from "@medusajs/medusa/core-flows";

const DEFAULT_PROFILE_NAME = "Default Shipping Profile";

export default async function ensureShipping({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const blockers: string[] = [];

  const profilesResult = await query.graph({ entity: "shipping_profile", fields: ["id", "name", "type"], pagination: { take: 20 } });
  let shippingProfile: any = (profilesResult.data || []).find((p: any) => p?.type === "default") || (profilesResult.data || []).find((p: any) => p?.name === DEFAULT_PROFILE_NAME);
  let createdProfile = false;

  if (!shippingProfile?.id) {
    const created = await createShippingProfilesWorkflow(container).run({ input: { data: [{ name: DEFAULT_PROFILE_NAME, type: "default" }] } });
    shippingProfile = created.result?.[0] as any;
    createdProfile = true;
  }

  const shippingOptionsResult = await query.graph({ entity: "shipping_option", fields: ["id", "name"], pagination: { take: 50 } });
  const shippingOption: any = (shippingOptionsResult.data || [])[0];

  if (!shippingProfile?.id) blockers.push("shipping_profile_missing");
  if (!shippingOption?.id) blockers.push("shipping_option_missing");

  console.log(JSON.stringify({ success: blockers.length === 0, created: { shippingProfile: createdProfile }, existing: { shippingProfile: !createdProfile, shippingOption: Boolean(shippingOption?.id) }, blockers, shippingProfileId: shippingProfile?.id ?? null, shippingOptionId: shippingOption?.id ?? null }, null, 2));
}
