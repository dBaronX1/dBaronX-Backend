import { Controller, Get, Param, Query } from '@nestjs/common'
import { GetProductsQueryDto } from './dto/get-products-query.dto'
import { ProductsService } from './products.service'

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  listProducts(@Query() query: GetProductsQueryDto) {
    return this.productsService.listProducts(query)
  }

  @Get(':handle')
  getProduct(@Param('handle') handle: string) {
    return this.productsService.getProductByHandle(handle)
  }
}