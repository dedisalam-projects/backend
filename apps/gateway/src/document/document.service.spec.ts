import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DocumentService } from './document.service';
import { DocumentGateway } from './document.gateway';
import { TravelokaReceipt, GojekReceipt, IndriveReceipt, JackalReceipt } from '@dedisalam/database';

describe('DocumentService', () => {
  let service: DocumentService;

  const mockModel = {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
    countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: '123', receiptNo: 'TRV123', status: 'draft' }),
      }),
    }),
    findByIdAndUpdate: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: '123', receiptNo: 'TRV123', status: 'generated' }),
      }),
    }),
    findByIdAndDelete: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: '123' }),
      }),
    }),
    create: jest.fn().mockImplementation((data) => ({
      ...data,
      _id: 'new_id',
      toObject: () => ({ ...data, _id: 'new_id' }),
    })),
  };

  const mockGateway = {
    notifyCreated: jest.fn(),
    notifyUpdated: jest.fn(),
    notifyDeleted: jest.fn(),
    notifyGenerated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        { provide: DocumentGateway, useValue: mockGateway },
        { provide: getModelToken(TravelokaReceipt.name), useValue: mockModel },
        { provide: getModelToken(GojekReceipt.name), useValue: mockModel },
        { provide: getModelToken(IndriveReceipt.name), useValue: mockModel },
        { provide: getModelToken(JackalReceipt.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated documents', async () => {
      const result = await service.findAll('traveloka', { page: 1, limit: 10 });
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result.page).toBe(1);
    });

    it('should throw BadRequestException on invalid provider', async () => {
      await expect(service.findAll('invalid_provider', {})).rejects.toThrow();
    });
  });

  describe('CRUD operations', () => {
    it('should findOne document', async () => {
      const doc = await service.findOne('traveloka', '123');
      expect(doc).toBeDefined();
      expect(doc._id).toBe('123');
    });

    it('should create document and notify gateway', async () => {
      const data = { receiptNo: 'TRV999', totalAmount: 100000 };
      const created = await service.create('traveloka', data);
      expect(created._id).toBe('new_id');
      expect(mockGateway.notifyCreated).toHaveBeenCalledWith('traveloka', expect.any(Object));
    });

    it('should update document and notify gateway', async () => {
      const updated = await service.update('traveloka', '123', { status: 'generated' });
      expect(updated._id).toBe('123');
      expect(mockGateway.notifyUpdated).toHaveBeenCalledWith('traveloka', expect.any(Object));
    });

    it('should delete document and notify gateway', async () => {
      const res = await service.delete('traveloka', '123');
      expect(res.success).toBe(true);
      expect(mockGateway.notifyDeleted).toHaveBeenCalledWith('traveloka', '123');
    });
  });

  describe('generatePdf', () => {
    it('should generate pdf and broadcast event', async () => {
      (service as any).asetGenerator = {
        generateBuffer: jest.fn().mockResolvedValue({
          buffer: Buffer.from('%PDF-1.4'),
          docType: 'TRAVELOKA',
        }),
      };

      const result = await service.generatePdf('traveloka', '123');
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toContain('Traveloka_');
      expect(mockGateway.notifyGenerated).toHaveBeenCalled();
    });
  });

  describe('transformToEnginePayload', () => {
    it('should transform Traveloka document correctly', () => {
      const doc = {
        category: 'Tiket Bus & Shuttle',
        receiptNo: '#123',
        poNumber: 'PO99',
        transactionDate: '09 Jul 2025',
        paymentMethod: 'GoPay',
        paymentStatus: 'Lunas',
        customer: { name: 'Dedi', email: 'd@s.com', phone: '0812' },
        passengerName: 'Dedi',
        items: [
          {
            itemNo: 1,
            itemType: 'Tiket Bus',
            descriptionLines: ['Rute Bandung-Jakarta'],
            quantity: 1,
            unitPrice: 100000,
            totalPrice: 100000,
          },
        ],
        totalAmount: 100000,
      };

      const payload = service.transformToEnginePayload('traveloka', doc);
      expect(payload.receipt_no).toBe('#123');
      expect(payload.customer.nama).toBe('Dedi');
      expect(payload.items[0].jml).toBe(1);
    });

    it('should transform Gojek document correctly', () => {
      const doc = {
        serviceType: 'gocar',
        orderId: 'RB-12345',
        transactionDate: '3 Des 2025',
        customerName: 'Dedi',
        driverName: 'Driver 1',
        vehiclePlate: 'D1234AB',
        vehicleType: 'Avanza',
        distance: '5 km',
        duration: '15 m',
        paymentRows: [{ item: 'Biaya perjalanan', amount: 20000 }],
        totalPaid: 20000,
      };

      const payload = service.transformToEnginePayload('gojek', doc);
      expect(payload.template).toBe('gocar');
      expect(payload.header.id_pesanan).toBe('RB-12345');
      expect(payload.page[0].greeting.nama).toBe('Dedi');
    });

    it('should transform inDrive document correctly', () => {
      const doc = {
        invoiceNumber: 'ID-001',
        tripDate: '2025-07-09',
        driverName: 'Driver InDrive',
        fare: 35000,
      };

      const payload = service.transformToEnginePayload('indrive', doc);
      expect(payload.invoice_number).toBe('ID-001');
      expect(payload.fare).toBe(35000);
      expect(payload.driver_name).toBe('Driver InDrive');
    });

    it('should transform Jackal document correctly', () => {
      const doc = {
        bookingCode: 'JCK-99',
        customer: { name: 'Dedi', phone: '0812' },
        payment: { totalPaid: 150000 },
      };

      const payload = service.transformToEnginePayload('jackal', doc);
      expect(payload.booking_code).toBe('JCK-99');
      expect(payload.customer.name).toBe('Dedi');
      expect(payload.payment.total_paid).toBe(150000);
    });
  });
});
