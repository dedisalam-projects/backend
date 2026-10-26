import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Product,
  ProductDocument,
  Category,
  CategoryDocument,
  Branch,
  BranchDocument,
  Brand,
  BrandDocument,
} from '@dedisalam/database';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductPaginationQueryDto,
  SyncIndogrosirDto,
} from '@dedisalam/common';
import { IndogrosirSyncService } from './indogrosir-sync.service';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Branch.name) private readonly branchModel: Model<BranchDocument>,
    @InjectModel(Brand.name) private readonly brandModel: Model<BrandDocument>,
    private readonly indogrosirSyncService: IndogrosirSyncService,
  ) {}

  async findAll(query: ProductPaginationQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.search && query.search.trim().length > 0) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { plu: searchRegex }];
    }

    if (query.category && query.category.trim().length > 0) {
      if (query.category.match(/^[0-9a-fA-F]{24}$/)) {
        filter.categoryId = query.category;
      } else {
        const cat = await this.categoryModel
          .findOne({
            $or: [
              { code: query.category.trim() },
              { name: new RegExp(`^${query.category.trim()}$`, 'i') },
            ],
          })
          .exec();
        if (cat) {
          filter.categoryId = cat._id;
        }
      }
    }

    if (query.isAvailable !== undefined) {
      filter.isAvailable = String(query.isAvailable) === 'true';
    }

    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sortOptions: Record<string, 1 | -1> = { [sortField]: sortOrder };

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('branchId')
        .populate('categoryId')
        .populate('brandId')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getStats() {
    const [totalProducts, availableProducts, categories, inventoryAgg, latestProduct] =
      await Promise.all([
        this.productModel.countDocuments().exec(),
        this.productModel.countDocuments({ isAvailable: true }).exec(),
        this.categoryModel.find({ isActive: true }).select('name code').lean().exec(),
        this.productModel.aggregate([
          {
            $group: {
              _id: null,
              totalValue: { $sum: '$price' },
            },
          },
        ]),
        this.productModel.findOne().sort({ lastSyncedAt: -1 }).select('lastSyncedAt').lean().exec(),
      ]);

    const totalInventoryValue = inventoryAgg.length > 0 ? inventoryAgg[0].totalValue : 0;
    const outOfStockProducts = totalProducts - availableProducts;

    return {
      totalProducts,
      availableProducts,
      outOfStockProducts,
      totalCategories: categories.length,
      categories: categories.map((c) => c.name),
      totalInventoryValue,
      lastSyncTime: latestProduct?.lastSyncedAt || null,
    };
  }

  async getRecap() {
    const [branches, categories, brands, products, latestProduct] = await Promise.all([
      this.branchModel.find().lean().exec(),
      this.categoryModel.find().lean().exec(),
      this.brandModel.find().lean().exec(),
      this.productModel
        .find()
        .populate('branchId')
        .populate('categoryId')
        .populate('brandId')
        .lean()
        .exec(),
      this.productModel.findOne().sort({ lastSyncedAt: -1 }).select('lastSyncedAt').lean().exec(),
    ]);

    // Island breakdown
    const islandMap: Record<string, { count: number; branches: any[] }> = {};
    for (const b of branches) {
      const island = (b as any).rawMetadata?.island_name || 'LAINNYA';
      if (!islandMap[island]) islandMap[island] = { count: 0, branches: [] };
      islandMap[island].count++;
      islandMap[island].branches.push({
        code: b.code,
        name: b.name,
        city: b.city,
        address: b.address,
        phone: b.phone,
      });
    }

    const categoryLevels = {
      division: categories.filter((c: any) => c.level === 'division').length,
      department: categories.filter((c: any) => c.level === 'department').length,
      category: categories.filter((c: any) => c.level === 'category').length,
      total: categories.length,
    };

    const divisions = categories
      .filter((c: any) => c.level === 'division')
      .map((d: any) => {
        const depts = categories.filter(
          (c: any) => c.level === 'department' && c.divisionCode === d.divisionCode,
        );
        const kats = categories.filter(
          (c: any) => c.level === 'category' && c.divisionCode === d.divisionCode,
        );
        return {
          code: d.code,
          name: d.name,
          divisionCode: d.divisionCode,
          departmentCount: depts.length,
          categoryCount: kats.length,
        };
      })
      .sort((a, b) => b.categoryCount + b.departmentCount - (a.categoryCount + a.departmentCount));

    const totalProducts = products.length;
    const availableProducts = products.filter((p) => p.isAvailable).length;
    const totalInventoryValue = products.reduce((acc, p) => acc + (p.price || 0), 0);
    const averagePrice =
      totalProducts > 0
        ? Math.round(products.reduce((acc, p) => acc + (p.price || 0), 0) / totalProducts)
        : 0;

    return {
      branches: {
        total: branches.length,
        active: branches.filter((b) => b.isActive).length,
        byIsland: Object.entries(islandMap)
          .map(([island, data]) => ({ island, ...data }))
          .sort((a, b) => b.count - a.count),
        items: branches,
      },
      categories: {
        total: categories.length,
        levels: categoryLevels,
        divisions,
        items: categories,
      },
      brands: {
        total: brands.length,
        active: brands.filter((b) => b.isActive).length,
        items: brands,
      },
      products: {
        total: totalProducts,
        available: availableProducts,
        outOfStock: totalProducts - availableProducts,
        totalInventoryValue,
        averagePrice,
        lastSyncedAt: latestProduct?.lastSyncedAt || null,
        items: products,
      },
    };
  }

  async findOne(idOrPlu: string) {
    const query = idOrPlu.match(/^[0-9a-fA-F]{24}$/) ? { _id: idOrPlu } : { plu: idOrPlu };

    const product = await this.productModel
      .findOne(query)
      .populate('branchId')
      .populate('categoryId')
      .populate('brandId')
      .lean()
      .exec();
    if (!product) {
      throw new NotFoundException(`Produk dengan identifier '${idOrPlu}' tidak ditemukan`);
    }
    return product;
  }

  async create(createDto: CreateProductDto) {
    const existing = await this.productModel.findOne({ plu: createDto.plu }).exec();
    if (existing) {
      throw new ConflictException(`Produk dengan PLU '${createDto.plu}' sudah terdaftar`);
    }

    const product = new this.productModel({
      ...createDto,
      source: 'manual',
      lastSyncedAt: new Date(),
    });

    return (await product.save()).toObject();
  }

  async update(idOrPlu: string, updateDto: UpdateProductDto) {
    const query = idOrPlu.match(/^[0-9a-fA-F]{24}$/) ? { _id: idOrPlu } : { plu: idOrPlu };

    const updated = await this.productModel
      .findOneAndUpdate(query, { $set: updateDto }, { new: true })
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException(`Produk dengan identifier '${idOrPlu}' tidak ditemukan`);
    }

    return updated;
  }

  async remove(idOrPlu: string) {
    const query = idOrPlu.match(/^[0-9a-fA-F]{24}$/) ? { _id: idOrPlu } : { plu: idOrPlu };

    const deleted = await this.productModel.findOneAndDelete(query).lean().exec();
    if (!deleted) {
      throw new NotFoundException(`Produk dengan identifier '${idOrPlu}' tidak ditemukan`);
    }

    return {
      success: true,
      message: `Produk '${deleted.name}' (PLU: ${deleted.plu}) berhasil dihapus`,
    };
  }

  async syncFromIndogrosir(dto: SyncIndogrosirDto) {
    this.logger.log(`Memulai sinkronisasi on-demand katalog KlikIndogrosir...`);
    return this.indogrosirSyncService.sync(dto);
  }

  // --- Branches ---
  async findAllBranches() {
    return this.branchModel.find().sort({ code: 1 }).lean().exec();
  }

  async findOneBranch(idOrCode: string) {
    const query = idOrCode.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: idOrCode }
      : { code: idOrCode.padStart(2, '0') };

    const branch = await this.branchModel.findOne(query).lean().exec();
    if (!branch) {
      throw new NotFoundException(`Cabang dengan identifier '${idOrCode}' tidak ditemukan`);
    }

    const products = await this.productModel
      .find({ $or: [{ branchId: branch._id }, { branchCode: branch.code }] })
      .populate('categoryId')
      .populate('brandId')
      .lean()
      .exec();

    return {
      ...branch,
      products,
    };
  }

  async createBranch(data: any) {
    const existing = await this.branchModel.findOne({ code: data.code }).exec();
    if (existing) throw new ConflictException(`Cabang dengan kode '${data.code}' sudah ada`);
    const branch = new this.branchModel(data);
    return (await branch.save()).toObject();
  }

  async updateBranch(id: string, data: any) {
    const updated = await this.branchModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean()
      .exec();
    if (!updated) throw new NotFoundException(`Cabang dengan ID '${id}' tidak ditemukan`);
    return updated;
  }

  async removeBranch(id: string) {
    const deleted = await this.branchModel.findByIdAndDelete(id).lean().exec();
    if (!deleted) throw new NotFoundException(`Cabang dengan ID '${id}' tidak ditemukan`);
    return { success: true, message: `Cabang '${deleted.name}' berhasil dihapus` };
  }

  // --- Categories ---
  async findAllCategories() {
    return this.categoryModel.find().sort({ name: 1 }).lean().exec();
  }

  async createCategory(data: any) {
    const existing = await this.categoryModel.findOne({ code: data.code }).exec();
    if (existing) throw new ConflictException(`Kategori dengan kode '${data.code}' sudah ada`);
    const category = new this.categoryModel(data);
    return (await category.save()).toObject();
  }

  async updateCategory(id: string, data: any) {
    const updated = await this.categoryModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean()
      .exec();
    if (!updated) throw new NotFoundException(`Kategori dengan ID '${id}' tidak ditemukan`);
    return updated;
  }

  async removeCategory(id: string) {
    const deleted = await this.categoryModel.findByIdAndDelete(id).lean().exec();
    if (!deleted) throw new NotFoundException(`Kategori dengan ID '${id}' tidak ditemukan`);
    return { success: true, message: `Kategori '${deleted.name}' berhasil dihapus` };
  }

  // --- Brands ---
  async findAllBrands() {
    return this.brandModel.find().sort({ name: 1 }).lean().exec();
  }

  async createBrand(data: any) {
    const existing = await this.brandModel.findOne({ code: data.code }).exec();
    if (existing) throw new ConflictException(`Brand dengan kode '${data.code}' sudah ada`);
    const brand = new this.brandModel(data);
    return (await brand.save()).toObject();
  }

  async updateBrand(id: string, data: any) {
    const updated = await this.brandModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean()
      .exec();
    if (!updated) throw new NotFoundException(`Brand dengan ID '${id}' tidak ditemukan`);
    return updated;
  }

  async removeBrand(id: string) {
    const deleted = await this.brandModel.findByIdAndDelete(id).lean().exec();
    if (!deleted) throw new NotFoundException(`Brand dengan ID '${id}' tidak ditemukan`);
    return { success: true, message: `Brand '${deleted.name}' berhasil dihapus` };
  }
}
