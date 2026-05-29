import { ExecArgs } from "@medusajs/framework/types";

import {
  PUBLISHABLE_KEY_TITLE,
  ensurePublishableKeyWorkflow,
  storeGet,
  tokenPreview,
} from "./ensure-publishable-key";

export const KEY_TITLE = PUBLISHABLE_KEY_TITLE;
export { storeGet, tokenPreview };

export async function ensurePublishableApiKey(container: ExecArgs["container"]) {
  const output = await ensurePublishableKeyWorkflow(container);
  const salesChannelId = output.salesChannelIds[0] || null;

  return {
    ...output,
    created: output.created ? ["publishable_api_key"] : [],
    existing: output.existing ? ["publishable_api_key"] : [],
    publishableApiKeyId: output.publishableKeyId,
    publishableApiKeyTokenPreview: output.tokenPreview,
    publishableApiKeyCreated: output.created,
    salesChannelId,
    linked: output.salesChannelLinked,
    storeProductsAccessible: null,
    storeRegionsAccessible: null,
    operatorInstruction: output.nextManualStep,
  };
}

export { default } from "./ensure-publishable-key";
