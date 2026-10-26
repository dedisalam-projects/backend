import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { NotFoundException } from '@nestjs/common';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductPaginationQueryDto,
  SyncIndogrosirDto,
} from '@dedisalam/common';

describe('ProductController', () => {
  let controller: ProductController;
  let service: jest.Mocked<ProductService>;

  const mockProduct = {
    _id: 'prod-123',
    plu: '10001',
    name: 'Minyak Goreng 2L',
    price: 35000,
    category: 'Minyak',
    isAvailable: true,
  };

  const mockProductService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getStats: jest.fn(),
    getRecap: jest.fn(),
    syncFromIndogrosir: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get(ProductService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProducts', () => {
    it('should return paginated products list', async () => {
      const query: ProductPaginationQueryDto = { page: 1, limit: 10 };
      const expectedResult = {
        data: [mockProduct],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(expectedResult as any);

      const res = await controller.getProducts(query);
      expect(res.success).toBe(true);
      expect(res.data).toEqual(expectedResult);
      expect(res.meta).toHaveProperty('timestamp');
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('getProductStats', () => {
    it('should return aggregated product stats', async () => {
      const stats = {
        totalProducts: 100,
        availableProducts: 80,
        outOfStockProducts: 20,
        totalInventoryValue: 5000000,
        categoriesCount: 5,
        lastSyncedAt: new Date().toISOString(),
      };
      service.getStats.mockResolvedValue(stats as any);

      const res = await controller.getProductStats();
      expect(res.success).toBe(true);
      expect(res.data).toEqual(stats);
      expect(service.getStats).toHaveBeenCalled();
    });
  });

  describe('getRecap', () => {
    it('should return recap summary data', async () => {
      const recap = {
        total: 10,
        byCategory: [{ category: 'Minyak', count: 10 }],
      };
      service.getRecap.mockResolvedValue(recap as any);

      const res = await controller.getRecap();
      expect(res.success).toBe(true);
      expect(res.data).toEqual(recap);
      expect(service.getRecap).toHaveBeenCalled();
    });
  });

  describe('getProductById', () => {
    it('should return product by id', async () => {
      service.findOne.mockResolvedValue(mockProduct as any);

      const res = await controller.getProductById('prod-123');
      expect(res.success).toBe(true);
      expect(res.data).toEqual(mockProduct);
      expect(service.findOne).toHaveBeenCalledWith('prod-123');
    });

    it('should propagate NotFoundException if product not found', async () => {
      service.findOne.mockRejectedValue(new NotFoundException('Product not found'));

      await expect(controller.getProductById('unknown')).rejects.toThrow(NotFoundException);
      expect(service.findOne).toHaveBeenCalledWith('unknown');
    });
  });

  describe('createProduct', () => {
    it('should create product successfully', async () => {
      const dto: CreateProductDto = {
        plu: '10001',
        name: 'Minyak Goreng 2L',
        price: 35000,
        category: 'Minyak',
        isAvailable: true,
      };
      service.create.mockResolvedValue(mockProduct as any);

      const res = await controller.createProduct(dto);
      expect(res.success).toBe(true);
      expect(res.message).toBe('Produk berhasil ditambahkan');
      expect(res.data).toEqual(mockProduct);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      const dto: UpdateProductDto = { price: 36000 };
      const updated = { ...mockProduct, price: 36000 };
      service.update.mockResolvedValue(updated as any);

      const res = await controller.updateProduct('prod-123', dto);
      expect(res.success).toBe(true);
      expect(res.message).toBe('Produk berhasil diperbarui');
      expect(res.data).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith('prod-123', dto);
    });

    it('should propagate NotFoundException on missing update target', async () => {
      service.update.mockRejectedValue(new NotFoundException('Product not found'));

      await expect(controller.updateProduct('unknown', { price: 1000 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      service.remove.mockResolvedValue({ success: true, message: 'Produk berhasil dihapus' });

      const res = await controller.deleteProduct('prod-123');
      expect(res.success).toBe(true);
      expect(res.message).toBe('Produk berhasil dihapus');
      expect(service.remove).toHaveBeenCalledWith('prod-123');
    });

    it('should propagate NotFoundException on missing delete target', async () => {
      service.remove.mockRejectedValue(new NotFoundException('Product not found'));

      await expect(controller.deleteProduct('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('syncIndogrosir', () => {
    it('should trigger sync and return stats', async () => {
      const body: SyncIndogrosirDto = { branchCode: 'TGR', limit: 50 };
      const syncResult = {
        processed: 50,
        inserted: 40,
        updated: 10,
        failed: 0,
        source: 'live_api' as const,
        durationMs: 1200,
      };
      service.syncFromIndogrosir.mockResolvedValue(syncResult);

      const res = await controller.syncIndogrosir(body);
      expect(res.success).toBe(true);
      expect(res.message).toBe('Sinkronisasi katalog KlikIndogrosir berhasil diselesaikan');
      expect(res.data).toEqual(syncResult);
      expect(service.syncFromIndogrosir).toHaveBeenCalledWith(body);
    });
  });
});
