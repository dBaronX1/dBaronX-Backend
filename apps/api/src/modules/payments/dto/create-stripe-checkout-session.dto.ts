export class CreateStripeCheckoutSessionDto {
  cartId!: string;
  userId?: string;
  orderIntentId?: string;
  supplierRefs?: string[];
  amount!: number;
  currency: string = "usd";
  successUrl!: string;
  cancelUrl!: string;
}
