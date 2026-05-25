import { IsIn, IsOptional } from "class-validator";
import { CreateStripeCheckoutSessionDto } from "./create-stripe-checkout-session.dto";

export class CreateCheckoutSessionDto extends CreateStripeCheckoutSessionDto {
  @IsOptional()
  @IsIn(["stripe", "paystack"])
  paymentProvider: "stripe" | "paystack" = "stripe";

  @IsOptional()
  referredByCode?: string;

  @IsOptional()
  referralCode?: string;
}
