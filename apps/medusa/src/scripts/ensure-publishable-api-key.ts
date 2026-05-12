import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

import { DEFAULT_SALES_CHANNEL_NAME } from "./shipping-readiness";

type QueryGraphResult = Record<string, unknown> | unknown[] | null | undefined;

const KEY_TITLE = "dBaronX Live Storefront Publishable Key";

const asArray = <T = Record<string, unknown>>(
  value: unknown,
  fallbackKeys: string[] = [],
): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of ["data", ...fallbackKeys]) {
    const nested = record[key];
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
};

const idOf = (value: unknown): string | null =>
  value && typeof value === "object" && typeof (value as any).id === "string"
    ? (value as any).id
    : null;

const tokenPreview = (token: unknown): string | null => {
  const value = String(token || "").trim();
  if (!value) return null;
  return value.length <= 16 ? `${value.slice(0, 4)}…` : `${value.slice(0, 8)}…${value.slice(-4)}`;
};

const medusaBaseUrl = () =>
  String(
    process.env.MEDUSA_BASE_URL ||
      process.env.MEDUSA_BACKEND_URL ||
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
      "",
  )
    .trim()
    .replace(/\/+$/, "");

async function storeGet(path: string, token: string | null): Promise<boolean | null> {
  const baseUrl = medusaBaseUrl();
  if (!baseUrl || !token) return null;
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { "x-publishable-api-key": token },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function ensurePublishableApiKey(container: ExecArgs["container"]) {
  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY);
  const created: string[] = [];
  const existing: string[] = [];
  const blockers: string[] = [];

  const salesChannelsResult: QueryGraphResult = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name", "is_default"],
    pagination: { take: 100 },
  });
  let salesChannel = asArray<Record<string, unknown>>(salesChannelsResult, [
    "sales_channels",
  ]).find(
    (channel) =>
      channel.name === DEFAULT_SALES_CHANNEL_NAME || channel.is_default === true || idOf(channel),
  );
  let salesChannelId = idOf(salesChannel);

  if (!salesChannelId) {
    const createdChannel = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: DEFAULT_SALES_CHANNEL_NAME,
            description: "Default sales channel for dBaronX storefront",
          },
        ],
      },
    });
    salesChannel = asArray<Record<string, unknown>>(createdChannel.result)[0];
    salesChannelId = idOf(salesChannel);
    if (salesChannelId) created.push("sales_channel");
  } else {
    existing.push("sales_channel");
  }

  if (salesChannelId) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: {},
        update: {
          default_sales_channel_id: salesChannelId,
          supported_currencies: [{ currency_code: "usd", is_default: true }],
        },
      },
    });
  } else {
    blockers.push("sales_channel_missing");
  }

  const keysResult: QueryGraphResult = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "token", "type", "sales_channels.id"],
    filters: { type: "publishable" },
    pagination: { take: 100 },
  });
  let key = asArray<Record<string, unknown>>(keysResult, ["api_keys"]).find(
    (candidate) =>
      candidate.title === KEY_TITLE ||
      asArray<Record<string, unknown>>(candidate.sales_channels).some(
        (channel) => idOf(channel) === salesChannelId,
      ) ||
      idOf(candidate),
  );
  let publishableApiKeyCreated = false;

  if (!key) {
    const createdKey = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: KEY_TITLE,
            type: "publishable",
            created_by: "ensure-publishable-api-key",
          },
        ],
      },
    });
    key = asArray<Record<string, unknown>>(createdKey.result)[0];
    publishableApiKeyCreated = true;
    if (idOf(key)) created.push("publishable_api_key");
  } else {
    existing.push("publishable_api_key");
  }

  const publishableApiKeyId = idOf(key);
  const token = typeof key?.token === "string" ? key.token : null;
  let linked = Boolean(
    salesChannelId &&
      asArray<Record<string, unknown>>(key?.sales_channels).some(
        (channel) => idOf(channel) === salesChannelId,
      ),
  );

  if (publishableApiKeyId && salesChannelId && !linked) {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: publishableApiKeyId, add: [salesChannelId] },
    });
    created.push("publishable_api_key_sales_channel_link");
    linked = true;
  }

  if (!publishableApiKeyId) blockers.push("publishable_api_key_missing");
  if (!linked) blockers.push("medusa_publishable_key_not_linked_to_sales_channel");

  const storeProductsAccessible = await storeGet("/store/products?limit=1", token);
  const storeRegionsAccessible = await storeGet("/store/regions", token);
  const operatorInstruction = token
    ? "Update MEDUSA_PUBLISHABLE_KEY and NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY with the new key token from this fresh Medusa DB; only a preview is printed here."
    : "Copy the publishable key token from Medusa Admin/API key details for this fresh DB, then update MEDUSA_PUBLISHABLE_KEY and NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY.";

  return {
    success: blockers.length === 0,
    created,
    existing,
    blockers,
    publishableApiKeyId,
    publishableApiKeyTokenPreview: tokenPreview(token),
    publishableApiKeyCreated,
    operatorInstruction,
    salesChannelId,
    linked,
    storeProductsAccessible,
    storeRegionsAccessible,
    nextManualStep:
      storeProductsAccessible === false || storeRegionsAccessible === false
        ? "Use the new publishable key from the fresh DB and ensure it is linked to the default sales channel; do not reuse the deleted DB key."
        : operatorInstruction,
  };
}

export default async function ensurePublishableKey({ container }: ExecArgs) {
  console.log(JSON.stringify(await ensurePublishableApiKey(container), null, 2));
}
