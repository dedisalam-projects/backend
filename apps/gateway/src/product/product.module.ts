import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Product,
  ProductSchema,
  Branch,
  BranchSchema,
  Category,
  CategorySchema,
  Brand,
  BrandSchema,
} from '@dedisalam/database';
import { ProductController } from './product.controller';
import { BranchController } from './branch.controller';
import { CategoryController } from './category.controller';
import { BrandController } from './brand.controller';
import { ProductService } from './product.service';
import { IndogrosirSyncService } from './indogrosir-sync.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Brand.name, schema: BrandSchema },
    ]),
  ],
  controllers: [ProductController, BranchController, CategoryController, BrandController],
  providers: [ProductService, IndogrosirSyncService],
  exports: [ProductService, IndogrosirSyncService],
})
export class ProductModule {}
