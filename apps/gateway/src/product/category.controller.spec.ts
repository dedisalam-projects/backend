import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { ProductService } from './product.service';
import { CreateCategoryDto, UpdateCategoryDto } from '@dedisalam/common';

describe('CategoryController', () => {
  let controller: CategoryController;
  let service: jest.Mocked<ProductService>;

  const mockCategory = {
    _id: 'cat-1',
    name: 'MAKANAN INSTAN',
    slug: 'makanan-instan',
    isActive: true,
  };

  const mockProductService = {
    findAllCategories: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    removeCategory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
    service = module.get(ProductService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCategories', () => {
    it('should return all categories', async () => {
      service.findAllCategories.mockResolvedValue([mockCategory] as never);

      const res = await controller.getCategories();
      expect(res.success).toBe(true);
      expect(res.data).toEqual([mockCategory]);
      expect(res.meta).toHaveProperty('timestamp');
      expect(service.findAllCategories).toHaveBeenCalled();
    });
  });

  describe('createCategory', () => {
    it('should create category successfully', async () => {
      const dto: CreateCategoryDto = { name: 'MAKANAN INSTAN', slug: 'makanan-instan' };
      service.createCategory.mockResolvedValue(mockCategory as never);

      const res = await controller.createCategory(dto);
      expect(res.success).toBe(true);
      expect(res.message).toBe('Kategori berhasil ditambahkan');
      expect(res.data).toEqual(mockCategory);
      expect(service.createCategory).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateCategory', () => {
    it('should update category successfully', async () => {
      const dto: UpdateCategoryDto = { description: 'Kategori makanan cepat saji' };
      const updated = { ...mockCategory, description: 'Kategori makanan cepat saji' };
      service.updateCategory.mockResolvedValue(updated as never);

      const res = await controller.updateCategory('cat-1', dto);
      expect(res.success).toBe(true);
      expect(res.message).toBe('Kategori berhasil diperbarui');
      expect(res.data).toEqual(updated);
      expect(service.updateCategory).toHaveBeenCalledWith('cat-1', dto);
    });
  });

  describe('deleteCategory', () => {
    it('should delete category successfully', async () => {
      service.removeCategory.mockResolvedValue({
        success: true,
        message: 'Kategori berhasil dihapus',
      });

      const res = await controller.deleteCategory('cat-1');
      expect(res.success).toBe(true);
      expect(res.message).toBe('Kategori berhasil dihapus');
      expect(service.removeCategory).toHaveBeenCalledWith('cat-1');
    });
  });
});
