import { Injectable, NotFoundException } from '@nestjs/common'
import { MedusaService } from '../integrations/medusa/medusa.service'

@Injectable()
export class ProductsService {
  constructor(private readonly medusaService: MedusaService) {}

  async listProducts(query: { limit?: number; offset?: number }) {
    const response = await this.medusaService.listProducts({
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    })

    return {
      success: true,
      ...response,
    }
  }

  async getProductByHandle(handle: string) {
    const response = await this.medusaService.getProductByHandle(handle)
    const product = response?.products?.[0]

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    return {
      success: true,
      product,
    }
  }
}