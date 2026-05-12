import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import {
  KEY_TITLE,
  storeGet,
  tokenPreview,
} from "./ensure-publishable-api-key";
import { DEFAULT_SALES_CHANNEL_NAME } from "./shipping-readiness";

type QueryGraphResult = Record<string, unknown> | unknown[] | null | undefined;

const CONFIRM_ENV = "DBX_CONFIRM_PRINT_MEDUSA_PUBLISHABLE_KEY";
const FALLBACK_INSTRUCTION =
  "Fallback if token_not_recoverable_from_service: use an authenticated Admin API key detail request such as curl -H \"Authorization: Bearer <admin-token>\" $MEDUSA_BASE_URL/admin/api-keys/<publishableApiKeyId>, or temporarily enable/access Medusa Admin API key details; do not use /app availability as proof because the admin build may be disabled. Then update MEDUSA_PUBLISHABLE_KEY, NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY, and PUBLIC_MEDUSA_PUBLISHABLE_KEY.";

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

const stringOf = (value: unknown): string => String(value || "").trim();

function output(payload: Record<string, unknown>, exitCode = 0): never {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(exitCode);
}

function isNamedForDbaronx(candidate: Record<string, unknown>): boolean {
  const title = stringOf(candidate.title).toLowerCase();
  return title.includes("dbaronx") && title.includes("storefront");
}

function salesChannelLinks(candidate: Record<string, unknown>): Record<string, unknown>[] {
  return asArray<Record<string, unknown>>(candidate.sales_channels, [
    "sales_channels",
  ]);
}

function isLinkedToSalesChannel(
  candidate: Record<string, unknown>,
  salesChannelId: string | null,
): boolean {
  return Boolean(
    salesChannelId &&
      salesChannelLinks(candidate).some((channel) => idOf(channel) === salesChannelId),
  );
}

function scoreKey(
  candidate: Record<string, unknown>,
  salesChannelId: string | null,
): number {
  let score = 0;
  if (isLinkedToSalesChannel(candidate, salesChannelId)) score += 100;
  if (candidate.title === KEY_TITLE) score += 50;
  if (isNamedForDbaronx(candidate)) score += 25;
  if (idOf(candidate)) score += 1;
  return score;
}

export async function printMedusaPublishableApiKey(container: ExecArgs["container"]) {
  if (process.env[CONFIRM_ENV] !== "true") {
    output(
      {
        success: false,
        blockers: ["explicit_confirmation_required"],
        publishableApiKeyId: null,
        publishableApiKeyToken: null,
        publishableApiKeyTokenPreview: null,
        salesChannelId: null,
        linked: false,
        storeProductsAccessible: null,
        storeRegionsAccessible: null,
        nextManualStep: `Rerun with ${CONFIRM_ENV}=true pnpm --filter @dbaronx/medusa run publishable-key:print to intentionally print the frontend publishable Store API key.`,
      },
      1,
    );
  }

  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY);
  const blockers: string[] = [];

  const salesChannelsResult: QueryGraphResult = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name", "is_default"],
    pagination: { take: 100 },
  });
  const salesChannels = asArray<Record<string, unknown>>(salesChannelsResult, [
    "sales_channels",
  ]);
  const salesChannel =
    salesChannels.find((channel) => channel.name === DEFAULT_SALES_CHANNEL_NAME) ||
    salesChannels.find((channel) => channel.is_default === true) ||
    salesChannels.find((channel) => idOf(channel)) ||
    null;
  const salesChannelId = idOf(salesChannel);
  if (!salesChannelId) blockers.push("sales_channel_missing");

  const keysResult: QueryGraphResult = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "token", "type", "sales_channels.id"],
    filters: { type: "publishable" },
    pagination: { take: 100 },
  });
  const keys = asArray<Record<string, unknown>>(keysResult, ["api_keys"])
    .filter((candidate) => idOf(candidate))
    .sort((a, b) => scoreKey(b, salesChannelId) - scoreKey(a, salesChannelId));
  const key = keys[0] || null;
  const publishableApiKeyId = idOf(key);
  const token = typeof key?.token === "string" ? key.token.trim() : "";
  const linked = Boolean(key && isLinkedToSalesChannel(key, salesChannelId));

  if (!publishableApiKeyId) blockers.push("publishable_api_key_missing");
  if (publishableApiKeyId && !linked)
    blockers.push("medusa_publishable_key_not_linked_to_sales_channel");
  if (publishableApiKeyId && !token)
    blockers.push("token_not_recoverable_from_service");

  const storeProductsAccessible = token
    ? await storeGet("/store/products?limit=1", token)
    : null;
  const storeRegionsAccessible = token
    ? await storeGet("/store/regions", token)
    : null;

  output({
    success: blockers.length === 0,
    blockers,
    publishableApiKeyId,
    publishableApiKeyToken: token || null,
    publishableApiKeyTokenPreview: tokenPreview(token),
    salesChannelId,
    linked,
    storeProductsAccessible,
    storeRegionsAccessible,
    nextManualStep: blockers.includes("token_not_recoverable_from_service")
      ? FALLBACK_INSTRUCTION
      : blockers.length
        ? "Run pnpm --filter @dbaronx/medusa run launch-commerce:ensure, then rerun this confirmed print command."
        : "Update MEDUSA_PUBLISHABLE_KEY, NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY, and PUBLIC_MEDUSA_PUBLISHABLE_KEY with publishableApiKeyToken, then run the one-cycle CJ shirt seed and readiness smokes.",
  });
}

export default async function printPublishableKey({ container }: ExecArgs) {
  await printMedusaPublishableApiKey(container);
}
