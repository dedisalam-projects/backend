import { DocumentController } from './document.controller';

describe('DocumentController (blip)', () => {
  let svc: any;
  let ctrl: DocumentController;

  beforeEach(() => {
    svc = {
      findAll: jest.fn().mockResolvedValue(['a']),
      findOne: jest.fn().mockResolvedValue({ id: 1 }),
      create: jest.fn().mockResolvedValue({ id: 2 }),
      update: jest.fn().mockResolvedValue({ id: 3 }),
      delete: jest.fn().mockResolvedValue({ ok: true }),
      generatePdf: jest
        .fn()
        .mockResolvedValue({ buffer: Buffer.from('pdf'), filename: 'f.pdf', docType: 'inv' }),
    };
    ctrl = new DocumentController(svc);
  });

  it('HTTP endpoints', async () => {
    expect((await ctrl.listDocuments('p', {} as any)).data).toEqual(['a']);
    expect((await ctrl.getDocument('p', '1')).data).toEqual({ id: 1 });
    expect((await ctrl.createDocument('p', {})).data).toEqual({ id: 2 });
    expect((await ctrl.updateDocument('p', '3', {})).data).toEqual({ id: 3 });
    expect((await ctrl.deleteDocument('p', '3')).data).toEqual({ ok: true });
  });

  it('generateDocumentPdf', async () => {
    const res: any = { set: jest.fn(), end: jest.fn() };
    await ctrl.generateDocumentPdf('p', '1', res);
    expect(res.set).toHaveBeenCalled();
    expect(res.end).toHaveBeenCalled();
  });

  it('message handlers', async () => {
    await ctrl.handleFindAll({ provider: 'p', query: { a: 1 } as any });
    await ctrl.handleFindAll({ provider: 'p', query: undefined as any });
    expect(svc.findAll).toHaveBeenLastCalledWith('p', {});
    await ctrl.handleFindOne({ provider: 'p', id: '1' });
    await ctrl.handleCreate({ provider: 'p', payload: {} });
    await ctrl.handleUpdate({ provider: 'p', id: '1', payload: {} });
    await ctrl.handleDelete({ provider: 'p', id: '1' });
    const r = await ctrl.handleGeneratePdf({ provider: 'p', id: '1' });
    expect(r.buffer).toBe(Buffer.from('pdf').toString('base64'));
  });
});
