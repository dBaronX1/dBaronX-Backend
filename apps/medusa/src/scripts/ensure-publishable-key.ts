import { ExecArgs } from "@medusajs/framework/types";
import { createApiKeysWorkflow, linkSalesChannelsToApiKeyWorkflow } from "@medusajs/medusa/core-flows";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function ensurePublishableKey({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const existing = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "token", "type"],
    filters: { type: "publishable" },
  });

  let key = existing.data?.[0] as { id: string; token: string; title: string } | undefined;

  if (!key) {
    const created = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          { title: "dBaronX Live Storefront Publishable Key", type: "publishable", created_by: "ensure-publishable-key" },
        ],
      },
    });
    key = created.result[0] as { id: string; token: string; title: string };
    logger.info(`Created publishable API key ${key.id}`);
  }

  const salesChannels = await query.graph({ entity: "sales_channel", fields: ["id", "name"] });
  const defaultSalesChannel = salesChannels.data?.[0] as { id: string; name: string } | undefined;

  if (defaultSalesChannel) {
    await linkSalesChannelsToApiKeyWorkflow(container).run({ input: { id: key.id, add: [defaultSalesChannel.id] } });
  }

  console.log(JSON.stringify({ keyId: key.id, publishableKey: key.token, salesChannelId: defaultSalesChannel?.id ?? null }, null, 2));
}
