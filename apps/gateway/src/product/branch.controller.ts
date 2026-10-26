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
import { Public, CreateBranchDto, UpdateBranchDto } from '@dedisalam/common';
import { ProductService } from './product.service';

@Controller('api/v1/branches')
@Public()
export class BranchController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async getBranches() {
    const data = await this.productService.findAllBranches();
    return {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get(':id')
  async getBranchById(@Param('id') id: string) {
    const data = await this.productService.findOneBranch(id);
    return {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBranch(@Body() body: CreateBranchDto) {
    const data = await this.productService.createBranch(body);
    return {
      success: true,
      message: 'Cabang berhasil ditambahkan',
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Put(':id')
  async updateBranch(@Param('id') id: string, @Body() body: UpdateBranchDto) {
    const data = await this.productService.updateBranch(id, body);
    return {
      success: true,
      message: 'Cabang berhasil diperbarui',
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Delete(':id')
  async deleteBranch(@Param('id') id: string) {
    const result = await this.productService.removeBranch(id);
    return {
      success: true,
      message: result.message,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
