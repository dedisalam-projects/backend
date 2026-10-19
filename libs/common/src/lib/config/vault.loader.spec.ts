const readMock = jest.fn();
jest.mock('node-vault', () => jest.fn(() => ({ read: readMock })));

import { vaultLoader } from './vault.loader';

describe('vaultLoader', () => {
  const old = { ...process.env };
  afterEach(() => {
    process.env = { ...old };
  });

  it('returns {} when env missing', async () => {
    delete process.env['VAULT_ADDR'];
    delete process.env['VAULT_TOKEN'];
    expect(await vaultLoader()).toEqual({});
  });

  it('returns secrets', async () => {
    process.env['VAULT_ADDR'] = 'http://v';
    process.env['VAULT_TOKEN'] = 't';
    readMock.mockResolvedValue({ data: { data: { A: '1' } } });
    expect(await vaultLoader()).toEqual({ A: '1' });
    readMock.mockResolvedValue({});
    expect(await vaultLoader()).toEqual({});
  });

  it('returns {} on error', async () => {
    process.env['VAULT_ADDR'] = 'http://v';
    process.env['VAULT_TOKEN'] = 't';
    readMock.mockRejectedValue(new Error('x'));
    expect(await vaultLoader()).toEqual({});
  });
});
