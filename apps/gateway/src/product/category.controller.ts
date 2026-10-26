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
import { Public, CreateCategoryDto, UpdateCategoryDto } from '@dedisalam/common';
import { ProductService } from './product.service';

@Controller('api/v1/categories')
@Public()
export class CategoryController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async getCategories() {
    const data = await this.productService.findAllCategories();
    return {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() body: CreateCategoryDto) {
    const data = await this.productService.createCategory(body);
    return {
      success: true,
      message: 'Kategori berhasil ditambahkan',
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Put(':id')
  async updateCategory(@Param('id') id: string, @Body() body: UpdateCategoryDto) {
    const data = await this.productService.updateCategory(id, body);
    return {
      success: true,
      message: 'Kategori berhasil diperbarui',
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Delete(':id')
  async deleteCategory(@Param('id') id: string) {
    const result = await this.productService.removeCategory(id);
    return {
      success: true,
      message: result.message,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
