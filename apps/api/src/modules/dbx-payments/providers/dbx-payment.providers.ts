import { Provider } from "@nestjs/common";
import { DbxChainVerifierClient } from "../dbx-chain-verifier.client";
import { DbxMedusaCommerceAdapter } from "../dbx-medusa-commerce.adapter";
import { DbxPaymentNotificationService } from "../services/dbx-payment-notification.service";
import {
  DBX_CHAIN_VERIFIER,
  DBX_COMMERCE_SYNC_PROVIDER,
  DBX_NOTIFICATION_PROVIDER,
} from "../interfaces/dbx-payment-provider.interface";

export const dbxPaymentProviderBindings: Provider[] = [
  {
    provide: DBX_CHAIN_VERIFIER,
    useExisting: DbxChainVerifierClient,
  },
  {
    provide: DBX_COMMERCE_SYNC_PROVIDER,
    useExisting: DbxMedusaCommerceAdapter,
  },
  {
    provide: DBX_NOTIFICATION_PROVIDER,
    useExisting: DbxPaymentNotificationService,
  },
];