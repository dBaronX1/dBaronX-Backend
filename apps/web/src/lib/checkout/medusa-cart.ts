type StoreCartResult = {
  configured: boolean;
  success?: boolean;
  cart?: unknown;
  cartId?: string;
  message: string;
};

export async function createMedusaCart(): Promise<StoreCartResult> {
  return { configured: false, success: false, message: "Rocket checkout is handled by the NestJS API checkout session route." };
}

export async function addMedusaCartLineItem(): Promise<StoreCartResult> {
  return { configured: false, success: false, message: "Rocket checkout is handled by the NestJS API checkout session route." };
}

export async function createCartWithLineItem(input: { variantId: string; quantity?: number; regionId?: string; email?: string }) {
  return {
    configured: Boolean(input.variantId),
    success: false,
    message: "Use the NestJS checkout session endpoint with the normalized product variant.",
  };
}
