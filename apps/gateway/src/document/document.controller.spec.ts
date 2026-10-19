import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { DocumentController } from './document.controller';

describe('DocumentController', () => {
  let controller: DocumentController;

  const mockBlipClient = {
    send: jest.fn<any, [string, any]>((pattern: string, data: any) => {
      switch (pattern) {
        case 'document.find_all':
          return of({
            items: [{ _id: '1', receiptNo: 'TRV123' }],
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
          });
        case 'document.find_one':
          return of({ _id: '1', receiptNo: 'TRV123' });
        case 'document.create':
          return of({ _id: '1', receiptNo: 'TRV123', status: 'draft' });
        case 'document.update':
          return of({ _id: '1', receiptNo: 'TRV123', status: 'draft' });
        case 'document.delete':
          return of({ success: true, id: '1' });
        case 'document.generate_pdf':
          return of({
            buffer: Buffer.from('%PDF-1.4').toString('base64'),
            filename: 'Traveloka_TRV123.pdf',
            docType: 'TRAVELOKA (BUS)',
          });
        default:
          return of(null);
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentController],
      providers: [{ provide: 'BLIP_SERVICES', useValue: mockBlipClient }],
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
      expect((result.data as any).items).toHaveLength(1);
    });
  });

  describe('getDocument', () => {
    it('should return a single document', async () => {
      const result = await controller.getDocument('traveloka', '1');
      expect(result.success).toBe(true);
      expect((result.data as any)._id).toBe('1');
    });
  });

  describe('createDocument', () => {
    it('should create document', async () => {
      const result = await controller.createDocument('traveloka', { receiptNo: 'TRV123' });
      expect(result.success).toBe(true);
      expect((result.data as any).receiptNo).toBe('TRV123');
    });
  });

  describe('updateDocument', () => {
    it('should update document', async () => {
      const result = await controller.updateDocument('traveloka', '1', { status: 'draft' });
      expect(result.success).toBe(true);
      expect((result.data as any).status).toBe('draft');
    });
  });

  describe('deleteDocument', () => {
    it('should delete document', async () => {
      const result = await controller.deleteDocument('traveloka', '1');
      expect(result.success).toBe(true);
      expect((result.data as any).success).toBe(true);
    });
  });

  describe('generateDocumentPdf', () => {
    const buildRes = () => ({ set: jest.fn(), end: jest.fn() });

    it('should stream pdf using filename from response', async () => {
      const res = buildRes();
      await controller.generateDocumentPdf('traveloka', '1', res as any);
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="Traveloka_TRV123.pdf"',
        }),
      );
      expect(res.end).toHaveBeenCalledWith(Buffer.from('%PDF-1.4'));
    });

    it('should fall back to generated filename when response has none', async () => {
      mockBlipClient.send.mockReturnValueOnce(
        of({ buffer: Buffer.from('%PDF-1.4').toString('base64') }),
      );
      const res = buildRes();
      await controller.generateDocumentPdf('traveloka', '1', res as any);
      const headers = res.set.mock.calls[0][0];
      expect(headers['Content-Disposition']).toMatch(/^inline; filename="document_\d+\.pdf"$/);
      expect(res.end).toHaveBeenCalled();
    });
  });
});
