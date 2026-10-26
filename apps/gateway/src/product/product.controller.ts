import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Logger,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  Public,
  CreateProductDto,
  UpdateProductDto,
  ProductPaginationQueryDto,
  SyncIndogrosirDto,
} from '@dedisalam/common';
import { ProductService } from './product.service';

@Controller('api/v1/products')
@Public()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(private readonly productService: ProductService) {}

  @Get()
  async getProducts(@Query() query: ProductPaginationQueryDto) {
    this.logger.log(`Handling GET /api/v1/products query: ${JSON.stringify(query)}`);
    const data = await this.productService.findAll(query);
    return {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get('stats')
  async getProductStats() {
    this.logger.log(`Handling GET /api/v1/products/stats`);
    const data = await this.productService.getStats();
    return {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get('recap')
  async getRecap() {
    this.logger.log(`Handling GET /api/v1/products/recap`);
    const data = await this.productService.getRecap();
    return {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get(':id')
  async getProductById(@Param('id') id: string) {
    this.logger.log(`Handling GET /api/v1/products/${id}`);
    const data = await this.productService.findOne(id);
    return {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProduct(@Body() body: CreateProductDto) {
    this.logger.log(`Handling POST /api/v1/products PLU: ${body.plu}`);
    const data = await this.productService.create(body);
    return {
      success: true,
      message: 'Produk berhasil ditambahkan',
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Put(':id')
  async updateProduct(@Param('id') id: string, @Body() body: UpdateProductDto) {
    this.logger.log(`Handling PUT /api/v1/products/${id}`);
    const data = await this.productService.update(id, body);
    return {
      success: true,
      message: 'Produk berhasil diperbarui',
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    this.logger.log(`Handling DELETE /api/v1/products/${id}`);
    const result = await this.productService.remove(id);
    return {
      success: true,
      message: result.message,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncIndogrosir(@Body() body: SyncIndogrosirDto) {
    this.logger.log(`Handling POST /api/v1/products/sync`);
    const stats = await this.productService.syncFromIndogrosir(body);
    return {
      success: true,
      message: 'Sinkronisasi katalog KlikIndogrosir berhasil diselesaikan',
      data: stats,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
