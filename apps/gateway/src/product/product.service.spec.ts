import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductService } from './product.service';
import { Product, Branch, Category, Brand } from '@dedisalam/database';
import { IndogrosirSyncService } from './indogrosir-sync.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductPaginationQueryDto,
  CreateBranchDto,
  UpdateBranchDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateBrandDto,
  UpdateBrandDto,
  SyncIndogrosirDto,
} from '@dedisalam/common';

describe('ProductService', () => {
  let service: ProductService;

  const mockProduct = {
    _id: '507f1f77bcf86cd799439011',
    plu: '10001',
    name: 'Minyak Goreng 2L',
    price: 35000,
    category: 'Minyak',
    isAvailable: true,
  };

  const mockBranch = {
    _id: '507f1f77bcf86cd799439012',
    code: '01',
    name: 'INDOGROSIR JAKARTA',
    city: 'Jakarta',
    province: 'DKI Jakarta',
    island: 'Jawa',
    isActive: true,
    rawMetadata: { island_name: 'JAWA' },
  };

  const mockCategory = {
    _id: '507f1f77bcf86cd799439013',
    code: 'CAT-01',
    name: 'MAKANAN',
    slug: 'makanan',
    division: 'Grocery',
    divisionCode: 'DIV-01',
    department: 'Food',
    level: 'division',
    isActive: true,
  };

  const mockBrand = {
    _id: '507f1f77bcf86cd799439014',
    code: 'BR-01',
    name: 'INDOMIE',
    slug: 'indomie',
    isActive: true,
  };

  function createMockModel() {
    const modelFunc = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({
        toObject: () => ({ ...dto, _id: 'generated-id' }),
      }),
    }));

    const methods = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
    };

    return Object.assign(modelFunc, methods);
  }

  let mockProductModel: ReturnType<typeof createMockModel>;
  let mockBranchModel: ReturnType<typeof createMockModel>;
  let mockCategoryModel: ReturnType<typeof createMockModel>;
  let mockBrandModel: ReturnType<typeof createMockModel>;

  const mockIndogrosirSyncService = {
    sync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockProductModel = createMockModel();
    mockBranchModel = createMockModel();
    mockCategoryModel = createMockModel();
    mockBrandModel = createMockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
        {
          provide: getModelToken(Branch.name),
          useValue: mockBranchModel,
        },
        {
          provide: getModelToken(Category.name),
          useValue: mockCategoryModel,
        },
        {
          provide: getModelToken(Brand.name),
          useValue: mockBrandModel,
        },
        {
          provide: IndogrosirSyncService,
          useValue: mockIndogrosirSyncService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  describe('findAll', () => {
    it('should return paginated products with default query', async () => {
      const mockQueryChain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockProduct]),
      };
      mockProductModel.find.mockReturnValue(mockQueryChain);
      mockProductModel.countDocuments.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(1),
      }));

      const query: ProductPaginationQueryDto = { page: 1, limit: 10 };
      const res = await service.findAll(query);

      expect(res.items).toEqual([mockProduct]);
      expect(res.total).toBe(1);
      expect(res.page).toBe(1);
      expect(res.limit).toBe(10);
      expect(res.totalPages).toBe(1);
    });

    it('should apply filters and custom sort', async () => {
      const mockQueryChain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockProduct]),
      };
      mockProductModel.find.mockReturnValue(mockQueryChain);
      mockProductModel.countDocuments.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(1),
      }));
      mockCategoryModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const query: ProductPaginationQueryDto = {
        page: 2,
        limit: 5,
        search: 'minyak',
        category: 'Minyak',
        isAvailable: true,
        sortBy: 'price',
        sortOrder: 'asc',
      };
      const res = await service.findAll(query);

      expect(res.items).toEqual([mockProduct]);
      expect(mockQueryChain.sort).toHaveBeenCalledWith({ price: 1 });
      expect(mockQueryChain.skip).toHaveBeenCalledWith(5);
      expect(mockQueryChain.limit).toHaveBeenCalledWith(5);
    });

    it('should filter by hex category id and found named category', async () => {
      const mockQueryChain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockProduct]),
      };
      mockProductModel.find.mockReturnValue(mockQueryChain);
      mockProductModel.countDocuments.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(1),
      }));
      mockCategoryModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439013' }),
      });

      // 1. Hex 24-char category
      await service.findAll({ category: '507f1f77bcf86cd799439013' });
      // 2. Named category found
      await service.findAll({ category: 'Makanan' });
    });
  });

  describe('findOne', () => {
    it('should return product when found by ID or PLU', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProduct),
      };
      mockProductModel.findOne.mockReturnValue(mockQuery);

      const res = await service.findOne('507f1f77bcf86cd799439011');
      expect(res).toEqual(mockProduct);

      // Find by PLU
      const resPlu = await service.findOne('10001');
      expect(resPlu).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      mockProductModel.findOne.mockReturnValue(mockQuery);

      await expect(service.findOne('507f1f77bcf86cd799439011')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto: CreateProductDto = {
      plu: '10002',
      name: 'Beras 5kg',
      price: 65000,
      category: 'Beras',
      isAvailable: true,
    };

    it('should create product when PLU does not exist', async () => {
      mockProductModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const res = await service.create(createDto);
      expect(res).toHaveProperty('_id', 'generated-id');
      expect(res.plu).toBe('10002');
    });

    it('should throw ConflictException when PLU already exists', async () => {
      mockProductModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateProductDto = { price: 38000 };

    it('should update and return product when found', async () => {
      const mockQuery = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ ...mockProduct, price: 38000 }),
      };
      mockProductModel.findOneAndUpdate.mockReturnValue(mockQuery);

      const res = await service.update('507f1f77bcf86cd799439011', updateDto);
      expect(res.price).toBe(38000);
      expect(mockProductModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '507f1f77bcf86cd799439011' },
        { $set: updateDto },
        { new: true },
      );
    });

    it('should throw NotFoundException when product not found', async () => {
      const mockQuery = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      mockProductModel.findOneAndUpdate.mockReturnValue(mockQuery);

      await expect(service.update('507f1f77bcf86cd799439011', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete product when found', async () => {
      mockProductModel.findOneAndDelete.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockProduct),
      });

      const res = await service.remove('507f1f77bcf86cd799439011');
      expect(res.success).toBe(true);
      expect(res.message).toContain('berhasil dihapus');
    });

    it('should throw NotFoundException when product not found', async () => {
      mockProductModel.findOneAndDelete.mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('507f1f77bcf86cd799439011')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return calculated statistics', async () => {
      mockProductModel.countDocuments
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(100) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(80) });

      mockCategoryModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([{ name: 'MAKANAN', code: 'CAT-01' }]),
          }),
        }),
      });

      mockProductModel.aggregate.mockResolvedValueOnce([{ totalValue: 5000000 }]);

      mockProductModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue({ lastSyncedAt: new Date('2026-10-26') }),
            }),
          }),
        }),
      });

      const res = await service.getStats();
      expect(res.totalProducts).toBe(100);
      expect(res.availableProducts).toBe(80);
      expect(res.outOfStockProducts).toBe(20);
      expect(res.totalInventoryValue).toBe(5000000);
      expect(res.totalCategories).toBe(1);
      expect(res.categories).toEqual(['MAKANAN']);
    });

    it('should return default statistics when inventory is empty', async () => {
      mockProductModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      mockCategoryModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockProductModel.aggregate.mockResolvedValueOnce([]);

      mockProductModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(null),
            }),
          }),
        }),
      });

      const res = await service.getStats();
      expect(res.totalProducts).toBe(0);
      expect(res.availableProducts).toBe(0);
      expect(res.totalInventoryValue).toBe(0);
      expect(res.lastSyncTime).toBeNull();
    });
  });

  describe('getRecap', () => {
    it('should return aggregated recap data', async () => {
      mockBranchModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockBranch]),
        }),
      });

      mockCategoryModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockCategory]),
        }),
      });

      mockBrandModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockBrand]),
        }),
      });

      mockProductModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockProduct]),
        }),
      });

      mockProductModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue({ lastSyncedAt: new Date('2026-10-26') }),
            }),
          }),
        }),
      });

      const res = await service.getRecap();
      expect(res.branches.total).toBe(1);
      expect(res.branches.active).toBe(1);
      expect(res.categories.total).toBe(1);
      expect(res.brands.total).toBe(1);
      expect(res.products.total).toBe(1);

      // Empty products case
      mockProductModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });
      const resEmpty = await service.getRecap();
      expect(resEmpty.products.total).toBe(0);
      expect(resEmpty.products.averagePrice).toBe(0);
    });
  });

  describe('syncFromIndogrosir', () => {
    it('should delegate to IndogrosirSyncService', async () => {
      const dto: SyncIndogrosirDto = { branchCode: '01', limit: 10 };
      const expected = { totalProcessed: 10, inserted: 5, updated: 5, failed: 0 };
      mockIndogrosirSyncService.sync.mockResolvedValue(expected);

      const res = await service.syncFromIndogrosir(dto);
      expect(res).toEqual(expected);
      expect(mockIndogrosirSyncService.sync).toHaveBeenCalledWith(dto);
    });
  });

  describe('Branch CRUD', () => {
    it('findAllBranches should return branch list', async () => {
      mockBranchModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockBranch]),
          }),
        }),
      });

      const res = await service.findAllBranches();
      expect(res).toEqual([mockBranch]);
    });

    it('findOneBranch should return branch when found', async () => {
      mockBranchModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockBranch),
        }),
      });

      mockProductModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockProduct]),
        }),
      });

      const res = await service.findOneBranch('507f1f77bcf86cd799439012');
      expect(res.code).toBe('01');
      expect(res.products).toEqual([mockProduct]);
    });

    it('findOneBranch should throw NotFoundException when missing', async () => {
      mockBranchModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.findOneBranch('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('createBranch should create branch when code is unique', async () => {
      const dto: CreateBranchDto = { code: '02', name: 'INDOGROSIR SURABAYA' };
      mockBranchModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const res = await service.createBranch(dto);
      expect(res).toHaveProperty('_id', 'generated-id');
    });

    it('createBranch should throw ConflictException on duplicate code', async () => {
      const dto: CreateBranchDto = { code: '01', name: 'INDOGROSIR JAKARTA' };
      mockBranchModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBranch),
      });

      await expect(service.createBranch(dto)).rejects.toThrow(ConflictException);
    });

    it('updateBranch should update branch when found', async () => {
      const dto: UpdateBranchDto = { name: 'INDOGROSIR JAKARTA BARAT' };
      mockBranchModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...mockBranch, ...dto }),
        }),
      });

      const res = await service.updateBranch('507f1f77bcf86cd799439012', dto);
      expect(res.name).toBe('INDOGROSIR JAKARTA BARAT');
    });

    it('updateBranch should throw NotFoundException when missing', async () => {
      mockBranchModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.updateBranch('missing-id', {})).rejects.toThrow(NotFoundException);
    });

    it('removeBranch should delete branch when found', async () => {
      mockBranchModel.findByIdAndDelete.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockBranch),
        }),
      });

      const res = await service.removeBranch('507f1f77bcf86cd799439012');
      expect(res.success).toBe(true);
    });

    it('removeBranch should throw NotFoundException when missing', async () => {
      mockBranchModel.findByIdAndDelete.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.removeBranch('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Category CRUD', () => {
    it('findAllCategories should return categories list', async () => {
      mockCategoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockCategory]),
          }),
        }),
      });

      const res = await service.findAllCategories();
      expect(res).toEqual([mockCategory]);
    });

    it('createCategory should create category when code is unique', async () => {
      const dto: CreateCategoryDto = { name: 'MINUMAN', slug: 'minuman', code: 'CAT-02' };
      mockCategoryModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const res = await service.createCategory(dto);
      expect(res).toHaveProperty('_id', 'generated-id');
    });

    it('createCategory should throw ConflictException on duplicate code', async () => {
      const dto: CreateCategoryDto = { name: 'MAKANAN', slug: 'makanan', code: 'CAT-01' };
      mockCategoryModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCategory),
      });

      await expect(service.createCategory(dto)).rejects.toThrow(ConflictException);
    });

    it('updateCategory should update category when found', async () => {
      const dto: UpdateCategoryDto = { description: 'Updated desc' };
      mockCategoryModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...mockCategory, ...dto }),
        }),
      });

      const res = await service.updateCategory('507f1f77bcf86cd799439013', dto);
      expect(res).toHaveProperty('description', 'Updated desc');
    });

    it('updateCategory should throw NotFoundException when missing', async () => {
      mockCategoryModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.updateCategory('missing-id', {})).rejects.toThrow(NotFoundException);
    });

    it('removeCategory should delete category when found', async () => {
      mockCategoryModel.findByIdAndDelete.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockCategory),
        }),
      });

      const res = await service.removeCategory('507f1f77bcf86cd799439013');
      expect(res.success).toBe(true);
    });

    it('removeCategory should throw NotFoundException when missing', async () => {
      mockCategoryModel.findByIdAndDelete.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.removeCategory('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Brand CRUD', () => {
    it('findAllBrands should return brands list', async () => {
      mockBrandModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockBrand]),
          }),
        }),
      });

      const res = await service.findAllBrands();
      expect(res).toEqual([mockBrand]);
    });

    it('createBrand should create brand when code is unique', async () => {
      const dto: CreateBrandDto = { name: 'SEDAAP', slug: 'sedaap', code: 'BR-02' };
      mockBrandModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const res = await service.createBrand(dto);
      expect(res).toHaveProperty('_id', 'generated-id');
    });

    it('createBrand should throw ConflictException on duplicate code', async () => {
      const dto: CreateBrandDto = { name: 'INDOMIE', slug: 'indomie', code: 'BR-01' };
      mockBrandModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockBrand),
      });

      await expect(service.createBrand(dto)).rejects.toThrow(ConflictException);
    });

    it('updateBrand should update brand when found', async () => {
      const dto: UpdateBrandDto = { description: 'Updated brand desc' };
      mockBrandModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...mockBrand, ...dto }),
        }),
      });

      const res = await service.updateBrand('507f1f77bcf86cd799439014', dto);
      expect(res).toHaveProperty('description', 'Updated brand desc');
    });

    it('updateBrand should throw NotFoundException when missing', async () => {
      mockBrandModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.updateBrand('missing-id', {})).rejects.toThrow(NotFoundException);
    });

    it('removeBrand should delete brand when found', async () => {
      mockBrandModel.findByIdAndDelete.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockBrand),
        }),
      });

      const res = await service.removeBrand('507f1f77bcf86cd799439014');
      expect(res.success).toBe(true);
    });

    it('removeBrand should throw NotFoundException when missing', async () => {
      mockBrandModel.findByIdAndDelete.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.removeBrand('missing-id')).rejects.toThrow(NotFoundException);
    });
  });
});
