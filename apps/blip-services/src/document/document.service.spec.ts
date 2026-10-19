import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentService } from './document.service';

const chain = (value: any) => {
  const c: any = {};
  ['sort', 'skip', 'limit', 'lean'].forEach((m) => (c[m] = jest.fn(() => c)));
  c.exec = jest.fn().mockResolvedValue(value);
  return c;
};

const makeModel = () => ({
  find: jest.fn(() => chain(['i'])),
  countDocuments: jest.fn(() => chain(25)),
  findById: jest.fn(() => chain({ receiptNo: 'a/b' })),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(() => chain({ ok: 1 })),
  findByIdAndDelete: jest.fn(() => chain({ ok: 1 })),
});

describe('DocumentService (blip)', () => {
  let models: any[];
  let engine: any;
  let svc: DocumentService;

  beforeEach(() => {
    models = [makeModel(), makeModel(), makeModel(), makeModel()];
    engine = {
      generateBuffer: jest.fn().mockResolvedValue({ buffer: Buffer.from('x'), docType: 'd' }),
    };
    svc = new DocumentService(models[0], models[1], models[2], models[3], engine);
  });

  const [T, G, I, J] = ['traveloka', 'gojek', 'indrive', 'jackal'];

  it('getModel rejects unknown / empty provider', async () => {
    await expect(svc.findAll('zzz', {} as any)).rejects.toThrow(BadRequestException);
    await expect(svc.findAll(undefined as any, {} as any)).rejects.toThrow(BadRequestException);
  });

  it('findAll with search for each provider and filters', async () => {
    for (const p of [T, G, I, J]) {
      const r = await svc.findAll(p, {
        search: ' x ',
        category: 'c',
        serviceType: 's',
        page: 2,
        limit: 5,
      } as any);
      expect(r.totalPages).toBe(5);
    }
    const r = await svc.findAll(T, { search: '  ' } as any);
    expect(r.page).toBe(1);
    expect(r.limit).toBe(10);
    await svc.findAll(T, { limit: 1000 } as any);
  });

  it('findOne', async () => {
    expect(await svc.findOne(T, '1')).toEqual({ receiptNo: 'a/b' });
    models[0].findById.mockReturnValueOnce(chain(null));
    await expect(svc.findOne(T, '1')).rejects.toThrow(NotFoundException);
  });

  it('create', async () => {
    models[0].create.mockResolvedValueOnce({ toObject: () => ({ a: 1 }) });
    expect(await svc.create(T, {})).toEqual({ a: 1 });
    models[0].create.mockResolvedValueOnce({ b: 2 });
    expect(await svc.create(T, {})).toEqual({ b: 2 });
  });

  it('update', async () => {
    expect(await svc.update(T, '1', {})).toEqual({ ok: 1 });
    models[0].findByIdAndUpdate.mockReturnValueOnce(chain(null));
    await expect(svc.update(T, '1', {})).rejects.toThrow(NotFoundException);
  });

  it('delete', async () => {
    expect(await svc.delete(T, '1')).toEqual({ success: true, id: '1' });
    models[0].findByIdAndDelete.mockReturnValueOnce(chain(null));
    await expect(svc.delete(T, '1')).rejects.toThrow(NotFoundException);
  });

  it('generatePdf for gojek uses wkhtmltopdf and derives filenames', async () => {
    models[1].findById.mockReturnValueOnce(chain({ orderId: 'o 1' }));
    const r = await svc.generatePdf(G, '1');
    expect(r.filename).toBe('Gojek_o_1.pdf');
    expect(engine.generateBuffer).toHaveBeenCalledWith(expect.anything(), {
      engine: 'wkhtmltopdf',
    });
    expect((await svc.generatePdf(T, '1')).filename).toBe('Traveloka_a_b.pdf');
    models[2].findById.mockReturnValueOnce(chain({ invoiceNumber: 'i1' }));
    expect((await svc.generatePdf(I, '1')).filename).toBe('inDrive_i1.pdf');
    models[3].findById.mockReturnValueOnce(chain({ bookingCode: 'b1' }));
    expect((await svc.generatePdf(J, '1')).filename).toBe('Jackal_b1.pdf');
  });

  it('deriveFilename defaults', () => {
    const d = (svc as any).deriveFilename.bind(svc);
    expect(d(T, {})).toBe('Traveloka_receipt.pdf');
    expect(d(G, {})).toBe('Gojek_order.pdf');
    expect(d(I, {})).toBe('inDrive_invoice.pdf');
    expect(d(J, {})).toBe('Jackal_booking.pdf');
    expect(d('x', {})).toMatch(/^document_\d+\.pdf$/);
  });

  it('generatePdf throws when engine unavailable', async () => {
    (svc as any).asetGenerator = null;
    (svc as any).pdfEngineService = undefined;
    jest.spyOn(svc as any, 'loadAsetGenerator').mockImplementation(() => undefined);
    await expect(svc.generatePdf(T, '1')).rejects.toThrow(BadRequestException);
  });

  it('generatePdf reloads the generator when missing but loadable', async () => {
    (svc as any).asetGenerator = null;
    jest.spyOn(svc as any, 'loadAsetGenerator').mockImplementation(() => {
      (svc as any).asetGenerator = engine;
    });
    expect((await svc.generatePdf(T, '1')).docType).toBe('d');
  });

  it('loadAsetGenerator: custom require success, failure', () => {
    const s: any = new DocumentService(models[0], models[1], models[2], models[3]);
    s.asetGenerator = null;
    const gen = { generateBuffer: jest.fn() };
    s.loadAsetGenerator(() => gen);
    expect(s.asetGenerator).toBe(gen);
    s.asetGenerator = null;
    s.loadAsetGenerator(() => {
      throw new Error('no');
    });
    expect(s.asetGenerator).toBeNull();
  });

  it('transformToEnginePayload: full and empty docs for every provider', () => {
    const full: any = {
      hotel: { hotelName: 'h' },
      items: [
        { itemNo: 1 },
        {
          quantity: 2,
          unitPrice: 1,
          totalPrice: 2,
          rowHeight: 1,
          description: 'd',
          descriptionLines: ['l'],
        },
      ],
      customer: { name: 'n', email: 'e', phone: 'p', address: 'a', otp: 'o' },
      paymentRows: [{ item: 'i', amount: 1 }],
      pickup: { date: 1 },
      destination: { date: 1, mapsUrl: 'm' },
      dropoff: {},
      departure: { mapsUrl: 'm' },
      passengers: [{ qrCode: 'q', name: 'n' }, {}],
      bookingCode: 'b',
      payment: { totalPrice: 1, adminFee: 1, discount: 1, totalPaid: 1, method: 'm', time: 't' },
      category: 'c',
      paymentStatus: 's',
      passengerName: 'p',
      guestName: 'g',
      serviceType: 's',
      orderType: 'o',
      description: 'd',
      fare: 1,
      paymentMethod: 'pm',
    };
    for (const p of [T, G, I, J]) {
      expect(svc.transformToEnginePayload(p, full)).toBeDefined();
      expect(svc.transformToEnginePayload(p, {})).toBeDefined();
    }
    expect(() => svc.transformToEnginePayload('zzz', {})).toThrow(BadRequestException);
    const j = svc.transformToEnginePayload(J, { passengers: [{}] });
    expect(j.tickets[0].ticket_no).toBe('TJKL0');
    expect(j.tickets[0].price).toBe(0);
  });
});
