import { Test, TestingModule } from '@nestjs/testing';
import { BranchController } from './branch.controller';
import { ProductService } from './product.service';
import { CreateBranchDto, UpdateBranchDto } from '@dedisalam/common';

describe('BranchController', () => {
  let controller: BranchController;
  let service: jest.Mocked<ProductService>;

  const mockBranch = {
    _id: 'branch-1',
    code: '04',
    name: 'INDOGROSIR BANDUNG',
    isActive: true,
  };

  const mockProductService = {
    findAllBranches: jest.fn(),
    findOneBranch: jest.fn(),
    createBranch: jest.fn(),
    updateBranch: jest.fn(),
    removeBranch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BranchController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    }).compile();

    controller = module.get<BranchController>(BranchController);
    service = module.get(ProductService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getBranches', () => {
    it('should return all branches', async () => {
      service.findAllBranches.mockResolvedValue([mockBranch] as never);

      const res = await controller.getBranches();
      expect(res.success).toBe(true);
      expect(res.data).toEqual([mockBranch]);
      expect(res.meta).toHaveProperty('timestamp');
      expect(service.findAllBranches).toHaveBeenCalled();
    });
  });

  describe('getBranchById', () => {
    it('should return branch by id', async () => {
      service.findOneBranch.mockResolvedValue(mockBranch as never);

      const res = await controller.getBranchById('branch-1');
      expect(res.success).toBe(true);
      expect(res.data).toEqual(mockBranch);
      expect(service.findOneBranch).toHaveBeenCalledWith('branch-1');
    });
  });

  describe('createBranch', () => {
    it('should create branch successfully', async () => {
      const dto: CreateBranchDto = { code: '04', name: 'INDOGROSIR BANDUNG' };
      service.createBranch.mockResolvedValue(mockBranch as never);

      const res = await controller.createBranch(dto);
      expect(res.success).toBe(true);
      expect(res.message).toBe('Cabang berhasil ditambahkan');
      expect(res.data).toEqual(mockBranch);
      expect(service.createBranch).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateBranch', () => {
    it('should update branch successfully', async () => {
      const dto: UpdateBranchDto = { name: 'INDOGROSIR BDG BARAT' };
      const updated = { ...mockBranch, name: 'INDOGROSIR BDG BARAT' };
      service.updateBranch.mockResolvedValue(updated as never);

      const res = await controller.updateBranch('branch-1', dto);
      expect(res.success).toBe(true);
      expect(res.message).toBe('Cabang berhasil diperbarui');
      expect(res.data).toEqual(updated);
      expect(service.updateBranch).toHaveBeenCalledWith('branch-1', dto);
    });
  });

  describe('deleteBranch', () => {
    it('should delete branch successfully', async () => {
      service.removeBranch.mockResolvedValue({ success: true, message: 'Cabang berhasil dihapus' });

      const res = await controller.deleteBranch('branch-1');
      expect(res.success).toBe(true);
      expect(res.message).toBe('Cabang berhasil dihapus');
      expect(service.removeBranch).toHaveBeenCalledWith('branch-1');
    });
  });
});
