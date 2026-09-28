import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentGateway } from './document.gateway';
import { TravelokaReceipt, GojekReceipt, IndriveReceipt, JackalReceipt } from '@dedisalam/database';

describe('DocumentService', () => {
  let service: DocumentService;

  const createMockModel = () => ({
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
  });

  let mockTravelokaModel: any;
  let mockGojekModel: any;
  let mockIndriveModel: any;
  let mockJackalModel: any;

  const mockGateway = {
    notifyCreated: jest.fn(),
    notifyUpdated: jest.fn(),
    notifyDeleted: jest.fn(),
    notifyGenerated: jest.fn(),
  };

  beforeEach(async () => {
    mockTravelokaModel = createMockModel();
    mockGojekModel = createMockModel();
    mockIndriveModel = createMockModel();
    mockJackalModel = createMockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        { provide: DocumentGateway, useValue: mockGateway },
        { provide: getModelToken(TravelokaReceipt.name), useValue: mockTravelokaModel },
        { provide: getModelToken(GojekReceipt.name), useValue: mockGojekModel },
        { provide: getModelToken(IndriveReceipt.name), useValue: mockIndriveModel },
        { provide: getModelToken(JackalReceipt.name), useValue: mockJackalModel },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loadAsetGenerator', () => {
    it('should successfully load from primary path', () => {
      const mockLoader = jest.fn().mockReturnValue({ generateBuffer: jest.fn() });
      (service as any).loadAsetGenerator(mockLoader);
      expect((service as any).asetGenerator).toBeDefined();
    });

    it('should fallback to second path when primary fails', () => {
      let callCount = 0;
      const mockLoader = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) throw new Error('Primary not found');
        return { generateBuffer: jest.fn() };
      });
      (service as any).loadAsetGenerator(mockLoader);
      expect((service as any).asetGenerator).toBeDefined();
    });

    it('should warn when both primary and fallback fail', () => {
      const mockLoader = jest.fn().mockImplementation(() => {
        throw new Error('All failed');
      });
      (service as any).loadAsetGenerator(mockLoader);
    });
  });

  describe('findAll', () => {
    it('should return paginated documents for traveloka', async () => {
      const result = await service.findAll('traveloka', { page: 1, limit: 10 });
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result.page).toBe(1);
    });

    it('should support search and filters across all providers', async () => {
      await service.findAll('traveloka', { search: 'tiket', category: 'bus' });
      expect(mockTravelokaModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'bus', $or: expect.any(Array) }),
      );

      await service.findAll('gojek', { search: 'RB-123', serviceType: 'gocar' });
      expect(mockGojekModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ serviceType: 'gocar', $or: expect.any(Array) }),
      );

      await service.findAll('indrive', { search: 'driver' });
      expect(mockIndriveModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ $or: expect.any(Array) }),
      );

      await service.findAll('jackal', { search: 'JCK' });
      expect(mockJackalModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ $or: expect.any(Array) }),
      );
    });

    it('should throw BadRequestException on invalid provider or empty/falsy provider', async () => {
      await expect(service.findAll('invalid_provider', {})).rejects.toThrow(BadRequestException);
      await expect(service.findAll('', {})).rejects.toThrow(BadRequestException);
      await expect(service.findAll(undefined as any, {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('CRUD operations', () => {
    it('should findOne document', async () => {
      const doc = await service.findOne('traveloka', '123');
      expect(doc).toBeDefined();
      expect(doc._id).toBe('123');
    });

    it('should throw NotFoundException if findOne returns null', async () => {
      mockTravelokaModel.findById.mockReturnValueOnce({
        lean: () => ({ exec: jest.fn().mockResolvedValue(null) }),
      });
      await expect(service.findOne('traveloka', 'not_found')).rejects.toThrow(NotFoundException);
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

    it('should throw NotFoundException if update target not found', async () => {
      mockTravelokaModel.findByIdAndUpdate.mockReturnValueOnce({
        lean: () => ({ exec: jest.fn().mockResolvedValue(null) }),
      });
      await expect(service.update('traveloka', 'not_found', {})).rejects.toThrow(NotFoundException);
    });

    it('should delete document and notify gateway', async () => {
      const res = await service.delete('traveloka', '123');
      expect(res.success).toBe(true);
      expect(mockGateway.notifyDeleted).toHaveBeenCalledWith('traveloka', '123');
    });

    it('should throw NotFoundException if delete target not found', async () => {
      mockTravelokaModel.findByIdAndDelete.mockReturnValueOnce({
        lean: () => ({ exec: jest.fn().mockResolvedValue(null) }),
      });
      await expect(service.delete('traveloka', 'not_found')).rejects.toThrow(NotFoundException);
    });
  });

  describe('generatePdf', () => {
    it('should generate pdf and broadcast event for traveloka', async () => {
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

    it('should recover when asetGenerator is initially null but reload succeeds', async () => {
      (service as any).asetGenerator = null;
      jest.spyOn<any, any>(service, 'loadAsetGenerator').mockImplementation(() => {
        (service as any).asetGenerator = {
          generateBuffer: jest.fn().mockResolvedValue({
            buffer: Buffer.from('%PDF-1.4'),
            docType: 'TRAVELOKA',
          }),
        };
      });

      const result = await service.generatePdf('traveloka', '123');
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it('should derive correct filenames for gojek, indrive, jackal, and other', async () => {
      (service as any).asetGenerator = {
        generateBuffer: jest.fn().mockResolvedValue({
          buffer: Buffer.from('%PDF-1.4'),
          docType: 'PDF',
        }),
      };

      mockGojekModel.findById.mockReturnValueOnce({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: '123', orderId: 'RB-99' }) }),
      });
      const resGojek = await service.generatePdf('gojek', '123');
      expect(resGojek.filename).toContain('Gojek_RB-99.pdf');

      mockIndriveModel.findById.mockReturnValueOnce({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: '123', invoiceNumber: 'INV-1' }) }),
      });
      const resIndrive = await service.generatePdf('indrive', '123');
      expect(resIndrive.filename).toContain('inDrive_INV-1.pdf');

      mockJackalModel.findById.mockReturnValueOnce({
        lean: () => ({ exec: jest.fn().mockResolvedValue({ _id: '123', bookingCode: 'JK-1' }) }),
      });
      const resJackal = await service.generatePdf('jackal', '123');
      expect(resJackal.filename).toContain('Jackal_JK-1.pdf');

      // Test fallback filenames when properties are missing
      expect((service as any).deriveFilename('traveloka', {})).toBe('Traveloka_receipt.pdf');
      expect((service as any).deriveFilename('gojek', {})).toBe('Gojek_order.pdf');
      expect((service as any).deriveFilename('indrive', {})).toBe('inDrive_invoice.pdf');
      expect((service as any).deriveFilename('jackal', {})).toBe('Jackal_booking.pdf');

      const fallbackFilename = (service as any).deriveFilename('custom', {});
      expect(fallbackFilename).toContain('document_');
    });

    it('should throw BadRequestException if asetGenerator cannot be loaded', async () => {
      (service as any).asetGenerator = null;
      jest.spyOn<any, any>(service, 'loadAsetGenerator').mockImplementation(() => {
        (service as any).asetGenerator = null;
      });

      await expect(service.generatePdf('traveloka', '123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('transformToEnginePayload', () => {
    it('should transform Traveloka document with hotel correctly', () => {
      const doc = {
        category: 'Hotel',
        receiptNo: '#HOTEL123',
        poNumber: 'PO-H',
        transactionDate: '10 Jul 2025',
        paymentMethod: 'Credit Card',
        paymentStatus: 'Lunas',
        customer: { name: 'Dedi', email: 'd@s.com', phone: '0812' },
        passengerName: 'Dedi',
        guestName: 'Dedi Guest',
        hotel: {
          hotelName: 'Grand Hyatt',
          address: 'Jakarta',
          checkInDate: '2025-07-10',
          duration: '2 Malam',
        },
        items: [
          {
            itemNo: 1,
            itemType: 'Kamar',
            descriptionLines: ['Deluxe Room'],
            description: 'Deluxe',
            quantity: 2,
            unitPrice: 500000,
            totalPrice: 1000000,
            rowHeight: 90,
          },
        ],
        totalAmount: 1000000,
      };

      const payload = service.transformToEnginePayload('traveloka', doc);
      expect(payload.receipt_no).toBe('#HOTEL123');
      expect(payload.hotel.nama).toBe('Grand Hyatt');
      expect(payload.guest).toBe('Dedi Guest');
      expect(payload.items[0].row_height).toBe(90);
    });

    it('should transform Traveloka document without optional fields safely', () => {
      const doc = {};
      const payload = service.transformToEnginePayload('traveloka', doc);
      expect(payload.category).toBe('Tiket Bus & Shuttle');
      expect(payload.status).toBe('Lunas');
      expect(payload.customer.nama).toBe('');
      expect(payload.hotel).toBeUndefined();
      expect(payload.items).toEqual([]);
    });

    it('should transform Traveloka with item lacking optional fields', () => {
      const doc = {
        items: [{ itemNo: 1, itemType: 'Ticket' }],
      };
      const payload = service.transformToEnginePayload('traveloka', doc);
      expect(payload.items[0].deskripsi_lines).toEqual([]);
      expect(payload.items[0].deskripsi).toBe('');
      expect(payload.items[0].jml).toBe(1);
      expect(payload.items[0].harga_satuan).toBe(0);
      expect(payload.items[0].total).toBe(0);
      expect(payload.items[0].row_height).toBe(83.25);
    });

    it('should transform Gojek document correctly with defaults', () => {
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

    it('should transform Gojek with missing payment rows', () => {
      const doc = {};
      const payload = service.transformToEnginePayload('gojek', doc);
      expect(payload.page[0].payment_rows).toEqual([]);
      expect(payload.page[1].total_box).toEqual([]);
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
      expect(payload.service).toBe('indrive-mobil');
    });

    it('should transform inDrive with missing optional fields', () => {
      const doc = {};
      const payload = service.transformToEnginePayload('indrive', doc);
      expect(payload.service).toBe('indrive-mobil');
      expect(payload.order_type).toBe('Perjalanan dalam kota');
      expect(payload.description).toBe('Tarif perjalanan (termasuk pajak)');
      expect(payload.fare).toBe(0);
      expect(payload.payment_method).toBe('Tunai');
      expect(payload.pickup.location).toBeUndefined();
      expect(payload.dropoff.location).toBeUndefined();
    });

    it('should transform Jackal document correctly with passengers and tickets', () => {
      const doc = {
        bookingCode: 'JCK-99',
        customer: { name: 'Dedi', phone: '0812' },
        passengers: [{ name: 'Dedi', seat: '1A', route: 'BDG-JKT', schedule: '10:00' }],
        payment: { totalPrice: 150000, totalPaid: 150000 },
      };

      const payload = service.transformToEnginePayload('jackal', doc);
      expect(payload.booking_code).toBe('JCK-99');
      expect(payload.customer.name).toBe('Dedi');
      expect(payload.passengers[0].name).toBe('Dedi');
      expect(payload.tickets[0].ticket_no).toBe('TJKLJCK-99');
      expect(payload.payment.total_paid).toBe(150000);
    });

    it('should transform Jackal with empty/missing properties and fallback tickets', () => {
      const doc = {
        customer: {},
        departure: {},
        destination: {},
        passengers: [{ name: 'Solo', seat: '1B' }],
        payment: {},
      };
      const payload = service.transformToEnginePayload('jackal', doc);
      expect(payload.booking_code).toBeUndefined();
      expect(payload.customer.address).toBe('-');
      expect(payload.customer.otp).toBe('');
      expect(payload.departure.maps_url).toBe('');
      expect(payload.destination.maps_url).toBe('');
      expect(payload.passengers[0].qr_code).toBe('');
      expect(payload.tickets[0].ticket_no).toBe('TJKL0');
      expect(payload.tickets[0].price).toBe(0);
      expect(payload.payment.total_price).toBe(0);
      expect(payload.payment.admin_fee).toBe(0);
      expect(payload.payment.discount).toBe(0);
      expect(payload.payment.total_paid).toBe(0);
      expect(payload.payment.method).toBe('BCA VIRTUAL ACCOUNT');
      expect(payload.payment.time).toBe('');

      const emptyJackal = {};
      const emptyPayload = service.transformToEnginePayload('jackal', emptyJackal);
      expect(emptyPayload.passengers).toEqual([]);
      expect(emptyPayload.tickets).toEqual([]);
    });

    it('should throw BadRequestException on unknown provider transformation', () => {
      expect(() => service.transformToEnginePayload('unknown_prov', {})).toThrow(
        BadRequestException,
      );
    });
  });
});
