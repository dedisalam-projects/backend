jest.mock('ioredis', () => {
  const handlers: Record<string, Array<(...args: any[]) => void>> = {};
  const redisMock: Record<string, any> = {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue('value'),
    del: jest.fn().mockResolvedValue(1),
    ping: jest.fn().mockResolvedValue('PONG'),
    disconnect: jest.fn(),
    on: jest.fn(),
    _emit: null as any,
  };
  redisMock['on'] = jest.fn((event: string, cb: (...args: any[]) => void) => {
    handlers[event] = handlers[event] || [];
    handlers[event].push(cb);
    return redisMock;
  });
  redisMock['_emit'] = (event: string, ...args: any[]) => {
    (handlers[event] || []).forEach((fn) => fn(...args));
  };
  return { Redis: jest.fn(() => redisMock), _mock: redisMock };
});

import { Logger } from '@nestjs/common';
import { Redis as _Redis } from 'ioredis';
import { RedisService } from './redis.service';

const IoredisMock = require('ioredis');
const mockClient = IoredisMock._mock;

describe('RedisService', () => {
  let svc: RedisService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    svc = new RedisService();
    svc.onModuleInit();
  });

  it('creates client and fires connect/error events', () => {
    expect(IoredisMock.Redis).toHaveBeenCalled();
    mockClient._emit('connect');
    expect(Logger.prototype.log).toHaveBeenCalled();
    const err = new Error('fail');
    mockClient._emit('error', err);
    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it('onModuleDestroy disconnects', () => {
    svc.onModuleDestroy();
    expect(mockClient.disconnect).toHaveBeenCalled();
    const svc2 = new RedisService();
    svc2.onModuleDestroy(); // no client yet — should not throw
  });

  it('getClient', () => {
    expect(svc.getClient()).toBe(mockClient);
  });

  it('set without TTL', async () => {
    expect(await svc.set('k', 'v')).toBe('OK');
    expect(mockClient.set).toHaveBeenCalledWith('k', 'v');
  });

  it('set with TTL', async () => {
    expect(await svc.set('k', 'v', 60)).toBe('OK');
    expect(mockClient.set).toHaveBeenCalledWith('k', 'v', 'EX', 60);
  });

  it('get', async () => {
    expect(await svc.get('k')).toBe('value');
  });

  it('del', async () => {
    expect(await svc.del('k')).toBe(1);
  });

  it('pingCheck: up', async () => {
    mockClient.ping.mockResolvedValueOnce('PONG');
    expect(await svc.pingCheck()).toEqual({ redis: { status: 'up' } });
  });

  it('pingCheck: down non-PONG', async () => {
    mockClient.ping.mockResolvedValueOnce('ERR');
    expect(await svc.pingCheck()).toEqual({ redis: { status: 'down' } });
  });

  it('pingCheck: error', async () => {
    mockClient.ping.mockRejectedValueOnce(new Error('timeout'));
    const r = await svc.pingCheck();
    expect(r.redis.status).toBe('down');
    expect(r.redis.message).toBe('timeout');
  });
});
