import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';

export class PricingTierDto {
  @IsString()
  unit!: string;

  @IsNumber()
  @Min(1)
  minQty!: number;

  @IsNumber()
  @IsOptional()
  fraction?: number;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsString()
  @IsOptional()
  label?: string;
}

export class ProductBranchDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;
}

export class ProductSpecDto {
  @IsNumber()
  @IsOptional()
  length?: number;

  @IsNumber()
  @IsOptional()
  width?: number;

  @IsNumber()
  @IsOptional()
  height?: number;

  @IsNumber()
  @IsOptional()
  grossWeight?: number;

  @IsString()
  @IsOptional()
  bpom?: string;
}

export class CreateBranchDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBranchDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateBrandDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBrandDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateCategoryDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  iconUrl?: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  iconUrl?: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateProductDto {
  @IsString()
  plu!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  brandId?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  promoPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  lowestPrice?: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PricingTierDto)
  pricingTiers?: PricingTierDto[];

  @IsString()
  @IsOptional()
  branchCode?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductSpecDto)
  spec?: ProductSpecDto;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  brandId?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  promoPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  lowestPrice?: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PricingTierDto)
  pricingTiers?: PricingTierDto[];

  @IsString()
  @IsOptional()
  branchCode?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductSpecDto)
  spec?: ProductSpecDto;
}

export class ProductPaginationQueryDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 10;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isAvailable?: boolean;

  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class SyncIndogrosirDto {
  @IsString()
  @IsOptional()
  branchCode?: string = '04';

  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number = 50;

  @IsBoolean()
  @IsOptional()
  forceRefresh?: boolean = false;
}
