import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Public, CreateBrandDto, UpdateBrandDto } from '@dedisalam/common';
import { ProductService } from './product.service';

@Controller('api/v1/brands')
@Public()
export class BrandController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async getBrands() {
    const data = await this.productService.findAllBrands();
    return {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBrand(@Body() body: CreateBrandDto) {
    const data = await this.productService.createBrand(body);
    return {
      success: true,
      message: 'Brand berhasil ditambahkan',
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Put(':id')
  async updateBrand(@Param('id') id: string, @Body() body: UpdateBrandDto) {
    const data = await this.productService.updateBrand(id, body);
    return {
      success: true,
      message: 'Brand berhasil diperbarui',
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Delete(':id')
  async deleteBrand(@Param('id') id: string) {
    const result = await this.productService.removeBrand(id);
    return {
      success: true,
      message: result.message,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
