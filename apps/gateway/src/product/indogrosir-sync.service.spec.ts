import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Product, Branch } from '@dedisalam/database';
import { IndogrosirSyncService } from './indogrosir-sync.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('IndogrosirSyncService', () => {
  let service: IndogrosirSyncService;

  const mockProductModel = {
    updateOne: jest.fn(),
  };

  const mockBranchModel = {
    findOneAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndogrosirSyncService,
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
        {
          provide: getModelToken(Branch.name),
          useValue: mockBranchModel,
        },
      ],
    }).compile();

    service = module.get<IndogrosirSyncService>(IndogrosirSyncService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sync', () => {
    it('should fallback to verified catalog dump when no token provided', async () => {
      delete process.env.KLIKINDOGROSIR_TOKEN;

      mockBranchModel.findOneAndUpdate.mockResolvedValue({
        _id: 'branch-04',
        code: '04',
      });
      mockProductModel.updateOne.mockResolvedValue({
        upsertedCount: 1,
        modifiedCount: 0,
        matchedCount: 0,
      });

      const stats = await service.sync({ branchCode: '04' });

      expect(stats.source).toBe('verified_catalog_dump');
      expect(stats.processed).toBeGreaterThan(0);
      expect(stats.inserted).toBe(stats.processed);
      expect(stats.failed).toBe(0);
      expect(mockBranchModel.findOneAndUpdate).toHaveBeenCalled();
      expect(mockProductModel.updateOne).toHaveBeenCalledTimes(stats.processed);
    });

    it('should use live API when token is provided and API succeeds', async () => {
      process.env.KLIKINDOGROSIR_TOKEN = 'mock-token';

      mockBranchModel.findOneAndUpdate.mockResolvedValue({
        _id: 'branch-04',
        code: '04',
      });
      mockedAxios.post.mockResolvedValue({
        data: {
          product_details: [
            {
              prdcd: '10001',
              long_description: 'INDOMIE GORENG 85G',
              brand: 'INDOMIE',
              division: 'MIE INSTAN',
              hrg_jual: 3100,
            },
            {
              plu: '10002',
              nama_produk: 'SARIMI SOTO',
              deskripsi: 'Deskripsi Sarimi',
              url_pic_prod: 'https://custom.png',
              isAvailable: false,
              pricing_tier: [{ unit: 'DUS', minQty: 24, price: 65000 }],
            },
          ],
        },
      });
      mockProductModel.updateOne
        .mockResolvedValueOnce({
          upsertedCount: 0,
          modifiedCount: 1,
          matchedCount: 1,
        })
        .mockResolvedValueOnce({
          upsertedCount: 0,
          modifiedCount: 0,
          matchedCount: 1,
        });

      const stats = await service.sync({ branchCode: '02' });

      expect(stats.source).toBe('live_api');
      expect(stats.processed).toBe(2);
      expect(stats.updated).toBe(2);
      expect(stats.failed).toBe(0);

      delete process.env.KLIKINDOGROSIR_TOKEN;
    });

    it('should fallback to dump when live API returns non-array or fails with non-Error', async () => {
      process.env.KLIKINDOGROSIR_TOKEN = 'mock-token';

      mockBranchModel.findOneAndUpdate.mockResolvedValue(null);
      mockedAxios.post.mockRejectedValue('String error');
      mockProductModel.updateOne.mockResolvedValue({
        upsertedCount: 1,
        modifiedCount: 0,
        matchedCount: 0,
      });

      const stats = await service.sync();

      expect(stats.source).toBe('verified_catalog_dump');
      expect(stats.processed).toBeGreaterThan(0);

      delete process.env.KLIKINDOGROSIR_TOKEN;
    });

    it('should fallback to dump when live API fails', async () => {
      process.env.KLIKINDOGROSIR_TOKEN = 'mock-token';

      mockBranchModel.findOneAndUpdate.mockResolvedValue({
        _id: 'branch-04',
        code: '04',
      });
      mockedAxios.post.mockRejectedValue(new Error('Network error'));
      mockProductModel.updateOne.mockResolvedValue({
        upsertedCount: 1,
        modifiedCount: 0,
        matchedCount: 0,
      });

      const stats = await service.sync({ branchCode: '04' });

      expect(stats.source).toBe('verified_catalog_dump');
      expect(stats.processed).toBeGreaterThan(0);

      delete process.env.KLIKINDOGROSIR_TOKEN;
    });

    it('should track failed upserts properly', async () => {
      delete process.env.KLIKINDOGROSIR_TOKEN;

      mockBranchModel.findOneAndUpdate.mockResolvedValue({
        _id: 'branch-04',
        code: '04',
      });
      mockProductModel.updateOne.mockRejectedValue(new Error('DB upsert error'));

      const stats = await service.sync({ branchCode: '04' });

      expect(stats.failed).toBe(stats.processed);
      expect(stats.inserted).toBe(0);
      expect(stats.updated).toBe(0);
    });
  });
});
