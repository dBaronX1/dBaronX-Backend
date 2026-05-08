import { Module } from "@nestjs/common";
import { DbxPaymentsModule } from "./dbx-payments.module";

/**
 * Backwards-compatible singular module alias.
 *
 * DbxPaymentsModule is the canonical owner for the DBX payment controller and
 * providers. Keeping this module as an import/export wrapper prevents accidental
 * duplicate controller registration if legacy imports use DbxPaymentModule.
 */
@Module({
  imports: [DbxPaymentsModule],
  exports: [DbxPaymentsModule],
})
export class DbxPaymentModule {}
