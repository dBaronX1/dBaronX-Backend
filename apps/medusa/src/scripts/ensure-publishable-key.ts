import fs from "node:fs";
import path from "node:path";

import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows";

import { DEFAULT_SALES_CHANNEL_NAME } from "./shipping-readiness";

export const PUBLISHABLE_KEY_TITLE = "dBaronX Storefront Publishable Key";
const LEGACY_KEY_TITLE = "dBaronX Live Storefront Publishable Key";
const PREFERRED_KEY_TITLES = [LEGACY_KEY_TITLE, PUBLISHABLE_KEY_TITLE] as const;

type QueryGraphResult = Record<string, unknown> | unknown[] | null | undefined;
type RecordValue = Record<string, unknown>;
type PublishableKeyMode = "list" | "ensure";

type EnsurePublishableKeyOutput = {
  success: boolean;
  mode: PublishableKeyMode;
  created: boolean;
  existing: boolean;
  publishableKeyId: string | null;
  publishableKeyTitle: string | null;
  tokenPreview: string | null;
  fullTokenAvailable: boolean;
  salesChannelIds: string[];
  salesChannelLinked: boolean;
  nextManualStep: string;
  blockers: string[];
};

const asArray = <T = RecordValue>(
  value: unknown,
  fallbackKeys: string[] = [],
): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const record = value as RecordValue;
  for (const key of ["data", ...fallbackKeys]) {
    const nested = record[key];
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
};

const idOf = (value: unknown): string | null =>
  value &&
  typeof value === "object" &&
  typeof (value as RecordValue).id === "string"
    ? String((value as RecordValue).id)
    : null;

const stringOf = (value: unknown): string | null => {
  const text = String(value || "").trim();
  return text || null;
};

const booleanEnv = (name: string): boolean =>
  ["1", "true", "yes", "y"].includes(
    String(process.env[name] || "")
      .trim()
      .toLowerCase(),
  );

const modeFromEnv = (): PublishableKeyMode =>
  String(
    process.env.MEDUSA_PUBLISHABLE_KEY_MODE ||
      process.env.DBX_PUBLISHABLE_KEY_MODE ||
      "ensure",
  ) === "list"
    ? "list"
    : "ensure";

const medusaBaseUrl = () =>
  String(
    process.env.MEDUSA_BASE_URL ||
      process.env.MEDUSA_BACKEND_URL ||
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
      "",
  )
    .trim()
    .replace(/\/+$/, "");

export async function storeGet(
  path: string,
  token: string | null,
): Promise<boolean | null> {
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

export const tokenPreview = (token: unknown): string | null => {
  const value = String(token || "").trim();
  if (!value) return null;
  return value.length <= 16
    ? `${value.slice(0, 4)}…`
    : `${value.slice(0, 8)}…${value.slice(-4)}`;
};

const isActivePublishableKey = (key: RecordValue): boolean =>
  key.type === "publishable" && !key.revoked_at && !key.revoked_by;

const salesChannelIdsOf = (value: unknown): string[] =>
  Array.from(
    new Set(asArray<RecordValue>(value).map(idOf).filter(Boolean) as string[]),
  );

const safeGraph = async (
  query: any,
  entity: string,
  fields: string[],
  filters?: Record<string, unknown>,
  take = 100,
): Promise<RecordValue[]> => {
  try {
    return asArray<RecordValue>(
      await query.graph({
        entity,
        fields,
        filters,
        pagination: { take },
      }),
      [`${entity}s`],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `publishable-key workflow could not query ${entity}: ${message}`,
    );
    return [];
  }
};

const chooseSalesChannel = async (query: any): Promise<RecordValue | null> => {
  const channels = await safeGraph(
    query,
    "sales_channel",
    ["id", "name", "is_default"],
    undefined,
    100,
  );

  const products = await safeGraph(
    query,
    "product",
    [
      "id",
      "sales_channels.id",
      "sales_channels.name",
      "sales_channels.is_default",
    ],
    undefined,
    25,
  );
  const productChannelIds = new Set(
    products.flatMap((product) => salesChannelIdsOf(product.sales_channels)),
  );

  return (
    channels.find((channel) => productChannelIds.has(String(channel.id))) ||
    channels.find((channel) => channel.name === DEFAULT_SALES_CHANNEL_NAME) ||
    channels.find((channel) => channel.is_default === true) ||
    channels[0] ||
    null
  );
};

const createDefaultSalesChannel = async (container: ExecArgs["container"]) => {
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

  return asArray<RecordValue>(createdChannel.result)[0] || null;
};

const titlePreference = (key: RecordValue): number => {
  const index = PREFERRED_KEY_TITLES.findIndex((title) => key.title === title);
  return index === -1 ? PREFERRED_KEY_TITLES.length : index;
};

const sortByPreferredTitle = (keys: RecordValue[]) =>
  [...keys].sort((a, b) => titlePreference(a) - titlePreference(b));

const findExistingLinkedKey = (
  keys: RecordValue[],
  targetSalesChannelId: string | null,
) =>
  sortByPreferredTitle(keys).find((key) => {
    if (!isActivePublishableKey(key)) return false;
    if (!targetSalesChannelId) return false;
    return salesChannelIdsOf(key.sales_channels).includes(targetSalesChannelId);
  }) || null;

const findReusableUnlinkedKey = (keys: RecordValue[]) =>
  sortByPreferredTitle(keys).find(
    (key) =>
      isActivePublishableKey(key) &&
      PREFERRED_KEY_TITLES.includes(key.title as any),
  ) || null;

const writeArtifact = (
  output: EnsurePublishableKeyOutput,
  fullToken: string | null,
) => {
  const outputPath = stringOf(
    process.env.MEDUSA_PUBLISHABLE_KEY_OUTPUT_PATH ||
      process.env.DBX_PUBLISHABLE_KEY_OUTPUT_PATH,
  );
  if (!outputPath) return;

  const artifactPayload = fullToken
    ? { ...output, publishableKeyToken: fullToken }
    : output;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(artifactPayload, null, 2)}\n`);
};

export async function ensurePublishableKeyWorkflow(
  container: ExecArgs["container"],
): Promise<EnsurePublishableKeyOutput> {
  const mode = modeFromEnv();
  const confirmCreate = booleanEnv("DBX_CONFIRM_CREATE_PUBLISHABLE_KEY");
  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY);
  const blockers: string[] = [];

  let salesChannel = await chooseSalesChannel(query);
  if (!salesChannel && mode === "ensure" && confirmCreate) {
    salesChannel = await createDefaultSalesChannel(container);
  }
  const salesChannelId = idOf(salesChannel);

  if (!salesChannelId) {
    blockers.push("sales_channel_missing");
  }

  const keys = await safeGraph(
    query,
    "api_key",
    [
      "id",
      "title",
      "token",
      "redacted",
      "type",
      "revoked_at",
      "revoked_by",
      "sales_channels.id",
      "sales_channels.name",
    ],
    { type: "publishable" },
    100,
  );

  let key =
    findExistingLinkedKey(keys, salesChannelId) ||
    findReusableUnlinkedKey(keys);
  let created = false;
  let fullToken: string | null = null;

  if (!key && mode === "ensure") {
    if (!confirmCreate) {
      blockers.push("confirm_create_required");
    } else {
      const createdKey = await createApiKeysWorkflow(container).run({
        input: {
          api_keys: [
            {
              title: PUBLISHABLE_KEY_TITLE,
              type: "publishable",
              created_by: "medusa-publishable-key-workflow",
            },
          ],
        },
      });
      key = asArray<RecordValue>(createdKey.result)[0] || null;
      fullToken = typeof key?.token === "string" ? key.token : null;
      created = Boolean(idOf(key));
    }
  }

  const publishableKeyId = idOf(key);
  const publishableKeyTitle = stringOf(key?.title);
  let linkedSalesChannelIds = salesChannelIdsOf(key?.sales_channels);
  let salesChannelLinked = Boolean(
    salesChannelId && linkedSalesChannelIds.includes(salesChannelId),
  );

  if (
    publishableKeyId &&
    salesChannelId &&
    !salesChannelLinked &&
    mode === "ensure"
  ) {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: publishableKeyId, add: [salesChannelId] },
    });
    linkedSalesChannelIds = Array.from(
      new Set([...linkedSalesChannelIds, salesChannelId]),
    );
    salesChannelLinked = true;
  }

  if (!publishableKeyId && mode === "list") {
    blockers.push("publishable_key_not_found");
  }
  if (publishableKeyId && salesChannelId && !salesChannelLinked) {
    blockers.push("publishable_key_not_linked_to_sales_channel");
  }

  const token = typeof key?.token === "string" ? key.token : null;
  const output: EnsurePublishableKeyOutput = {
    success: blockers.length === 0,
    mode,
    created,
    existing: Boolean(publishableKeyId && !created),
    publishableKeyId,
    publishableKeyTitle,
    tokenPreview: tokenPreview(token || key?.redacted),
    fullTokenAvailable: Boolean(fullToken),
    salesChannelIds: linkedSalesChannelIds,
    salesChannelLinked,
    nextManualStep: fullToken
      ? "Full token is only in the medusa-publishable-key-output.json artifact. Store it immediately in MEDUSA_PUBLISHABLE_KEY/NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY and never paste it publicly."
      : publishableKeyId
        ? "Use the existing linked publishable key. If only a preview is visible, create a rotated key with confirmCreate=true during a maintenance window."
        : mode === "list"
          ? "No linked publishable key was found. Rerun the workflow with mode=ensure and confirmCreate=true to create one."
          : "Rerun the workflow with confirmCreate=true to allow creating a new publishable key.",
    blockers,
  };

  writeArtifact(output, fullToken);

  if (fullToken) {
    console.error(
      "WARNING: A full Medusa publishable API key was created and written only to the GitHub Actions artifact. Store it immediately; it may not be recoverable later.",
    );
  }

  return output;
}

export default async function ensurePublishableKey({ container }: ExecArgs) {
  console.log(
    JSON.stringify(await ensurePublishableKeyWorkflow(container), null, 2),
  );
}
