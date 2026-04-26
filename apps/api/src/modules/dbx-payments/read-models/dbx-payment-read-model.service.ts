import { Injectable } from "@nestjs/common";
import { DbxPaymentMapper } from "../mappers/dbx-payment.mapper";
import { DbxPaymentQueryService } from "../queries/dbx-payment-query.service";
import type {
  DbxPaymentReadModel,
  DbxPaymentReadModelPage,
  DbxPaymentReadModelQuery,
} from "../interfaces/dbx-payment-read-model.interface";

@Injectable()
export class DbxPaymentReadModelService {
  constructor(
    private readonly query: DbxPaymentQueryService,
    private readonly mapper: DbxPaymentMapper,
  ) {}

  async list(query: DbxPaymentReadModelQuery): Promise<DbxPaymentReadModelPage> {
    const result = await this.query.list({
      reference: query.reference,
      cartId: query.cartId,
      medusaOrderId: query.medusaOrderId,
      email: query.email,
      status: query.status,
      transactionSignature: query.transactionSignature,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });

    return {
      items: result.items.map((item) => {
        const view = this.mapper.toIntentView(item);

        return {
          id: view.id,
          reference: view.reference,
          status: item.status,
          userId: item.user_id,
          email: item.email,
          customerName: item.customer_name,
          cartId: view.cartId,
          medusaOrderId: view.medusaOrderId,
          expectedUsdCents: view.expectedUsdCents,
          expectedDbxBaseUnits: view.expectedDbxBaseUnits,
          dbxMint: view.dbxMint,
          treasuryWallet: view.treasuryWallet,
          senderWallet: view.senderWallet,
          transactionSignature: view.transactionSignature,
          expiresAt: view.expiresAt,
          verifiedAt: view.verifiedAt,
          completedAt: view.completedAt,
          failureReason: view.failureReason,
          metadata: item.metadata || {},
          createdAt: view.createdAt,
          updatedAt: view.updatedAt,
        };
      }),
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasNextPage: result.hasNextPage,
    };
  }
}