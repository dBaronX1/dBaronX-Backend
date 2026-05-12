import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

const PUBLISHABLE_KEY_TITLE = "dBaronX Storefront Publishable API Key";
const PUBLISHABLE_KEY_TYPE = "publishable";
const STORE_API_TIMEOUT_MS = 15_000;

type ApiKeyRecord = {
  id: string;
  title?: string | null;
  token?: string | null;
  type?: string | null;
  revoked_at?: string | null;
  redacted?: string | null;
  sales_channels?: SalesChannelRecord[] | null;
};

type SalesChannelRecord = {
  id: string;
  name?: string | null;
  is_disabled?: boolean | null;
};

type StoreRecord = {
  id?: string | null;
  default_sales_channel_id?: string | null;
  default_sales_channel?: SalesChannelRecord | null;
};

type StoreEndpointProof = {
  accessible: boolean;
  blocker: string | null;
  status: number | null;
};

type EnsurePublishableApiKeyResult = {
  success: boolean;
  blockers: string[];
  publishableApiKeyId: string | null;
  publishableApiKeyToken: string | null;
  salesChannelId: string | null;
  linked: boolean;
  storeProductsAccessible: boolean;
  storeRegionsAccessible: boolean;
  nextManualStep: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asArray = <T = unknown>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

const pushUnique = (values: string[], value: string) => {
  if (value && !values.includes(value)) values.push(value);
};

const errorBlocker = (prefix: string, error: unknown): string => {
  const errorName = error instanceof Error ? error.name : typeof error;
  return `${prefix}:${errorName || "unknown_error"}`;
};

const normalizeBaseUrl = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "").replace(/\/store$/, "");
};

const getStoreApiBaseUrl = (): string | null =>
  normalizeBaseUrl(process.env.MEDUSA_STORE_API_URL) ||
  normalizeBaseUrl(process.env.MEDUSA_BACKEND_URL) ||
  normalizeBaseUrl(process.env.RENDER_EXTERNAL_URL) ||
  normalizeBaseUrl(process.env.PUBLIC_MEDUSA_BACKEND_URL) ||
  normalizeBaseUrl(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL) ||
  "http://localhost:9000";

async function safeGraph(
  query: any,
  entity: string,
  fields: string[],
  filters?: Record<string, unknown>,
  take = 50,
): Promise<Record<string, unknown>[]> {
  try {
    const result = await query.graph({
      entity,
      fields,
      filters,
      pagination: { take },
    });
    return asArray<Record<string, unknown>>(result?.data).filter(isRecord);
  } catch {
    return [];
  }
}

async function findPublishableKey(query: any): Promise<ApiKeyRecord | null> {
  const apiKeys = await safeGraph(
    query,
    "api_key",
    [
      "id",
      "title",
      "token",
      "redacted",
      "type",
      "revoked_at",
      "sales_channels.id",
      "sales_channels.name",
      "sales_channels.is_disabled",
    ],
    { type: PUBLISHABLE_KEY_TYPE },
    100,
  );

  const publishableKeys = apiKeys
    .filter((apiKey): apiKey is ApiKeyRecord =>
      typeof apiKey.id === "string" &&
      String(apiKey.type || "").toLowerCase() === PUBLISHABLE_KEY_TYPE &&
      !apiKey.revoked_at,
    )
    .sort((a, b) => {
      const aTitle = String(a.title || "");
      const bTitle = String(b.title || "");
      const aExact = aTitle === PUBLISHABLE_KEY_TITLE ? 0 : 1;
      const bExact = bTitle === PUBLISHABLE_KEY_TITLE ? 0 : 1;
      const aDbx = /dbaronx/i.test(aTitle) ? 0 : 1;
      const bDbx = /dbaronx/i.test(bTitle) ? 0 : 1;
      return aExact - bExact || aDbx - bDbx || aTitle.localeCompare(bTitle);
    });

  return publishableKeys[0] || null;
}

async function findOrCreatePublishableKey(
  container: ExecArgs["container"],
  query: any,
): Promise<ApiKeyRecord | null> {
  const existing = await findPublishableKey(query);
  if (existing) return existing;

  const created = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: PUBLISHABLE_KEY_TITLE,
          type: PUBLISHABLE_KEY_TYPE,
          created_by: "ensure-publishable-api-key",
        },
      ],
    },
  });

  const key = asArray<ApiKeyRecord>(created.result)[0];
  return key && typeof key.id === "string" ? key : null;
}

async function findStore(query: any): Promise<StoreRecord | null> {
  const store = (
    await safeGraph(
      query,
      "store",
      [
        "id",
        "default_sales_channel_id",
        "default_sales_channel.id",
        "default_sales_channel.name",
        "default_sales_channel.is_disabled",
      ],
      undefined,
      1,
    )
  )[0];

  return isRecord(store) ? (store as StoreRecord) : null;
}

async function findSalesChannels(query: any): Promise<SalesChannelRecord[]> {
  const channels = await safeGraph(
    query,
    "sales_channel",
    ["id", "name", "is_disabled"],
    undefined,
    100,
  );

  return channels.filter(
    (channel): channel is SalesChannelRecord =>
      typeof channel.id === "string" && channel.is_disabled !== true,
  );
}

async function findOrCreateSalesChannel(
  container: ExecArgs["container"],
  query: any,
): Promise<SalesChannelRecord | null> {
  const store = await findStore(query);
  if (store?.default_sales_channel?.id && store.default_sales_channel.is_disabled !== true) {
    return store.default_sales_channel;
  }

  const channels = await findSalesChannels(query);
  const defaultChannel =
    channels.find((channel) => channel.id === store?.default_sales_channel_id) ||
    channels.find((channel) => /default/i.test(String(channel.name || ""))) ||
    channels.find((channel) => /dbaronx/i.test(String(channel.name || ""))) ||
    channels[0];

  if (defaultChannel) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: {},
        update: { default_sales_channel_id: defaultChannel.id },
      },
    });
    return defaultChannel;
  }

  const created = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        {
          name: "dBaronX Default Sales Channel",
          description: "Default sales channel for the dBaronX storefront",
        },
      ],
    },
  });
  const createdChannel = asArray<SalesChannelRecord>(created.result)[0];

  if (!createdChannel?.id) return null;

  await updateStoresWorkflow(container).run({
    input: {
      selector: {},
      update: { default_sales_channel_id: createdChannel.id },
    },
  });

  return createdChannel;
}

async function ensureApiKeyLinkedToSalesChannel(
  container: ExecArgs["container"],
  query: any,
  apiKeyId: string,
  salesChannelId: string,
): Promise<boolean> {
  const currentKey = (
    await safeGraph(
      query,
      "api_key",
      ["id", "sales_channels.id"],
      { id: apiKeyId },
      1,
    )
  )[0] as ApiKeyRecord | undefined;

  const alreadyLinked = asArray<SalesChannelRecord>(currentKey?.sales_channels).some(
    (channel) => channel.id === salesChannelId,
  );

  if (!alreadyLinked) {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: apiKeyId, add: [salesChannelId] },
    });
  }

  const verifiedKey = (
    await safeGraph(
      query,
      "api_key",
      ["id", "sales_channels.id"],
      { id: apiKeyId },
      1,
    )
  )[0] as ApiKeyRecord | undefined;

  return asArray<SalesChannelRecord>(verifiedKey?.sales_channels).some(
    (channel) => channel.id === salesChannelId,
  );
}

async function verifyStoreEndpoint(
  baseUrl: string,
  path: string,
  publishableApiKeyToken: string,
): Promise<StoreEndpointProof> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STORE_API_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        "x-publishable-api-key": publishableApiKeyToken,
      },
      signal: controller.signal,
    });

    if (response.ok) {
      return { accessible: true, blocker: null, status: response.status };
    }

    return {
      accessible: false,
      blocker: `store_api_${path.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "")}_status_${response.status}`,
      status: response.status,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.name || error.message : "unknown_error";
    return {
      accessible: false,
      blocker: `store_api_${path.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "")}_unreachable:${reason}`,
      status: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

const buildNextManualStep = (result: Omit<EnsurePublishableApiKeyResult, "nextManualStep">): string => {
  if (result.success && result.publishableApiKeyToken) {
    return "Update storefront/public runtime env vars that hold the Medusa publishable key to the publishableApiKeyToken value printed in this JSON output, then redeploy/restart the storefront.";
  }

  if (!result.publishableApiKeyToken) {
    return "Run pnpm --filter @dbaronx/medusa run publishable-key:ensure on Render after db:prepare succeeds; copy publishableApiKeyToken from the JSON stdout.";
  }

  if (!result.linked) {
    return "Open Medusa Admin > Settings > Publishable API Keys, link the printed publishableApiKeyId to the printed salesChannelId, then rerun publishable-key:ensure.";
  }

  return "Ensure MEDUSA_BACKEND_URL or MEDUSA_STORE_API_URL points at the reachable Medusa service URL, rerun publishable-key:ensure, and only update storefront env vars after storeProductsAccessible and storeRegionsAccessible are true.";
};

export default async function ensurePublishableApiKey({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const blockers: string[] = [];

  let key: ApiKeyRecord | null = null;
  let salesChannel: SalesChannelRecord | null = null;
  let linked = false;
  let storeProductsAccessible = false;
  let storeRegionsAccessible = false;

  try {
    key = await findOrCreatePublishableKey(container, query);
    if (!key?.id) pushUnique(blockers, "publishable_api_key_missing");
    if (!key?.token) pushUnique(blockers, "publishable_api_key_token_missing");
  } catch (error) {
    pushUnique(blockers, errorBlocker("publishable_api_key_ensure_failed", error));
  }

  try {
    salesChannel = await findOrCreateSalesChannel(container, query);
    if (!salesChannel?.id) pushUnique(blockers, "sales_channel_missing");
  } catch (error) {
    pushUnique(blockers, errorBlocker("sales_channel_ensure_failed", error));
  }

  if (key?.id && salesChannel?.id) {
    try {
      linked = await ensureApiKeyLinkedToSalesChannel(container, query, key.id, salesChannel.id);
      if (!linked) pushUnique(blockers, "publishable_api_key_sales_channel_link_missing");
    } catch (error) {
      pushUnique(blockers, errorBlocker("publishable_api_key_sales_channel_link_failed", error));
    }
  }

  if (key?.token) {
    const storeApiBaseUrl = getStoreApiBaseUrl();
    if (!storeApiBaseUrl) {
      pushUnique(blockers, "store_api_base_url_missing");
    } else {
      const productsProof = await verifyStoreEndpoint(
        storeApiBaseUrl,
        "/store/products?limit=1",
        key.token,
      );
      storeProductsAccessible = productsProof.accessible;
      if (productsProof.blocker) pushUnique(blockers, productsProof.blocker);

      const regionsProof = await verifyStoreEndpoint(
        storeApiBaseUrl,
        "/store/regions?limit=1",
        key.token,
      );
      storeRegionsAccessible = regionsProof.accessible;
      if (regionsProof.blocker) pushUnique(blockers, regionsProof.blocker);
    }
  }

  const withoutNextManualStep = {
    success:
      blockers.length === 0 &&
      Boolean(key?.id) &&
      Boolean(key?.token) &&
      Boolean(salesChannel?.id) &&
      linked &&
      storeProductsAccessible &&
      storeRegionsAccessible,
    blockers,
    publishableApiKeyId: key?.id || null,
    publishableApiKeyToken: key?.token || null,
    salesChannelId: salesChannel?.id || null,
    linked,
    storeProductsAccessible,
    storeRegionsAccessible,
  };

  const output: EnsurePublishableApiKeyResult = {
    ...withoutNextManualStep,
    nextManualStep: buildNextManualStep(withoutNextManualStep),
  };

  console.log(JSON.stringify(output, null, 2));
}
