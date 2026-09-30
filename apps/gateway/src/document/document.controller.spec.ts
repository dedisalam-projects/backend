import { Test, TestingModule } from '@nestjs/testing';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';

describe('DocumentController', () => {
  let controller: DocumentController;

  const mockDocumentService = {
    findAll: jest.fn().mockResolvedValue({
      items: [{ _id: '1', receiptNo: 'TRV123' }],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    }),
    findOne: jest.fn().mockResolvedValue({ _id: '1', receiptNo: 'TRV123' }),
    create: jest.fn().mockResolvedValue({ _id: '1', receiptNo: 'TRV123', status: 'draft' }),
    update: jest.fn().mockResolvedValue({ _id: '1', receiptNo: 'TRV123', status: 'draft' }),
    delete: jest.fn().mockResolvedValue({ success: true, id: '1' }),
    generatePdf: jest.fn().mockResolvedValue({
      buffer: Buffer.from('%PDF-1.4'),
      filename: 'Traveloka_TRV123.pdf',
      docType: 'TRAVELOKA (BUS)',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentController],
      providers: [{ provide: DocumentService, useValue: mockDocumentService }],
    }).compile();

    controller = module.get<DocumentController>(DocumentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listDocuments', () => {
    it('should return list of documents', async () => {
      const result = await controller.listDocuments('traveloka', {});
      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(1);
    });
  });

  describe('getDocument', () => {
    it('should return a single document', async () => {
      const result = await controller.getDocument('traveloka', '1');
      expect(result.success).toBe(true);
      expect(result.data._id).toBe('1');
    });
  });

  describe('createDocument', () => {
    it('should create document', async () => {
      const result = await controller.createDocument('traveloka', { receiptNo: 'TRV123' });
      expect(result.success).toBe(true);
      expect(result.data.receiptNo).toBe('TRV123');
    });
  });

  describe('updateDocument', () => {
    it('should update document', async () => {
      const result = await controller.updateDocument('traveloka', '1', { status: 'draft' });
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('draft');
    });
  });

  describe('deleteDocument', () => {
    it('should delete document', async () => {
      const result = await controller.deleteDocument('traveloka', '1');
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('1');
    });
  });

  describe('generateDocumentPdf', () => {
    it('should stream generated pdf to response', async () => {
      const res = {
        set: jest.fn(),
        end: jest.fn(),
      } as any;

      await controller.generateDocumentPdf('traveloka', '1', res);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/pdf',
        }),
      );
      expect(res.end).toHaveBeenCalled();
    });
  });
});
