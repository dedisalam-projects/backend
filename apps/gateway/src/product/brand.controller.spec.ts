import { Test, TestingModule } from '@nestjs/testing';
import { BrandController } from './brand.controller';
import { ProductService } from './product.service';
import { CreateBrandDto, UpdateBrandDto } from '@dedisalam/common';

describe('BrandController', () => {
  let controller: BrandController;
  let service: jest.Mocked<ProductService>;

  const mockBrand = {
    _id: 'brand-1',
    name: 'INDOMIE',
    slug: 'indomie',
    isActive: true,
  };

  const mockProductService = {
    findAllBrands: jest.fn(),
    createBrand: jest.fn(),
    updateBrand: jest.fn(),
    removeBrand: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrandController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    }).compile();

    controller = module.get<BrandController>(BrandController);
    service = module.get(ProductService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getBrands', () => {
    it('should return all brands', async () => {
      service.findAllBrands.mockResolvedValue([mockBrand] as never);

      const res = await controller.getBrands();
      expect(res.success).toBe(true);
      expect(res.data).toEqual([mockBrand]);
      expect(res.meta).toHaveProperty('timestamp');
      expect(service.findAllBrands).toHaveBeenCalled();
    });
  });

  describe('createBrand', () => {
    it('should create brand successfully', async () => {
      const dto: CreateBrandDto = { name: 'INDOMIE', slug: 'indomie' };
      service.createBrand.mockResolvedValue(mockBrand as never);

      const res = await controller.createBrand(dto);
      expect(res.success).toBe(true);
      expect(res.message).toBe('Brand berhasil ditambahkan');
      expect(res.data).toEqual(mockBrand);
      expect(service.createBrand).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateBrand', () => {
    it('should update brand successfully', async () => {
      const dto: UpdateBrandDto = { description: 'Mi Instan Ternama' };
      const updated = { ...mockBrand, description: 'Mi Instan Ternama' };
      service.updateBrand.mockResolvedValue(updated as never);

      const res = await controller.updateBrand('brand-1', dto);
      expect(res.success).toBe(true);
      expect(res.message).toBe('Brand berhasil diperbarui');
      expect(res.data).toEqual(updated);
      expect(service.updateBrand).toHaveBeenCalledWith('brand-1', dto);
    });
  });

  describe('deleteBrand', () => {
    it('should delete brand successfully', async () => {
      service.removeBrand.mockResolvedValue({ success: true, message: 'Brand berhasil dihapus' });

      const res = await controller.deleteBrand('brand-1');
      expect(res.success).toBe(true);
      expect(res.message).toBe('Brand berhasil dihapus');
      expect(service.removeBrand).toHaveBeenCalledWith('brand-1');
    });
  });
});
