import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { BaseAuthService } from './auth-operations.helper';

class Svc extends BaseAuthService {
  constructor(m: any, r: any, c: any, n?: any) {
    super(m, r, c, n);
  }
}

const sel = (v: any) => ({ select: jest.fn().mockResolvedValue(v) });

describe('BaseAuthService', () => {
  let model: any;
  let redis: any;
  let notif: any;
  let cfg: any;
  let svc: any;
  let hash: string;

  beforeAll(async () => {
    hash = await bcrypt.hash('pw', 4);
  });

  beforeEach(() => {
    model = {
      countDocuments: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
    };
    redis = { get: jest.fn(), set: jest.fn() };
    notif = { emit: jest.fn() };
    cfg = { get: jest.fn((k: string) => (k === 'JWT_SECRET' ? 'secret' : undefined)) };
    svc = new Svc(model, redis, cfg, notif);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  it('throws without secret', () => {
    expect(() => new Svc(model, redis, { get: () => undefined })).toThrow('JWT_SECRET');
  });

  describe('bootstrap', () => {
    it('creates default superadmin with defaults', async () => {
      model.countDocuments.mockResolvedValue(0);
      await svc.onApplicationBootstrap();
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'superadmin@example.com' }),
      );
    });
    it('uses configured credentials', async () => {
      cfg.get.mockImplementation((k: string) => k);
      model.countDocuments.mockResolvedValue(0);
      await new Svc(model, redis, cfg).onApplicationBootstrap();
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'DEFAULT_SUPERADMIN_EMAIL' }),
      );
    });
    it('skips when exists', async () => {
      model.countDocuments.mockResolvedValue(1);
      await svc.onApplicationBootstrap();
      expect(model.create).not.toHaveBeenCalled();
    });
    it('logs on failure', async () => {
      model.countDocuments.mockRejectedValue(new Error('x'));
      await svc.onApplicationBootstrap();
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const user = { _id: 'u1', name: 'n', email: 'e', role: 'user', isActive: false };
    it('validates input', async () => {
      await expect(svc.register({ email: '', password: '', name: '' })).rejects.toThrow('required');
    });
    it('rejects duplicate', async () => {
      model.findOne.mockResolvedValue({});
      await expect(svc.register({ email: 'e', password: 'p', name: 'n' })).rejects.toThrow(
        'exists',
      );
    });
    it('registers (with and without client, role)', async () => {
      model.findOne.mockResolvedValue(null);
      model.create.mockResolvedValue(user);
      const r = await svc.register({ email: 'e', password: 'p', name: 'n', role: 'admin' });
      expect(r.message).toContain('registered');
      expect(notif.emit).toHaveBeenCalled();
      const noClient = new Svc(model, redis, cfg);
      await noClient.register({ email: 'e', password: 'p', name: 'n' });
      model.create.mockResolvedValue({ ...user, isActive: undefined });
      await svc.register({ email: 'e', password: 'p', name: 'n' });
    });
    it('swallows emit failure', async () => {
      model.findOne.mockResolvedValue(null);
      model.create.mockResolvedValue(user);
      notif.emit.mockImplementation(() => {
        throw new Error('down');
      });
      await svc.register({ email: 'e', password: 'p', name: 'n' });
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const u = () => ({ _id: 'u1', email: 'e', name: 'n', role: 'user', password: hash });
    it('rejects unknown user and bad password', async () => {
      model.findOne.mockReturnValue(sel(null));
      await expect(svc.login({ email: 'e', password: 'pw' })).rejects.toThrow('Invalid');
      model.findOne.mockReturnValue(sel(u()));
      await expect(svc.login({ email: 'e', password: 'bad' })).rejects.toThrow('Invalid');
    });
    it('logs in', async () => {
      model.findOne.mockReturnValue(sel(u()));
      const r = await svc.login({ email: 'e', password: 'pw' });
      expect(r.accessToken).toBeDefined();
      expect(redis.set).toHaveBeenCalled();
      const noClient = new Svc(model, redis, cfg);
      await noClient.login({ email: 'e', password: 'pw' });
    });
    it('swallows emit failure', async () => {
      model.findOne.mockReturnValue(sel(u()));
      notif.emit.mockImplementation(() => {
        throw new Error('down');
      });
      await svc.login({ email: 'e', password: 'pw' });
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('validates', async () => {
      await expect(svc.refresh({ userId: '', refreshToken: '' })).rejects.toThrow('Missing');
    });
    it('rejects invalid stored token', async () => {
      redis.get.mockResolvedValue(null);
      await expect(svc.refresh({ userId: 'u', refreshToken: 't' })).rejects.toThrow(
        'Invalid refresh',
      );
      redis.get.mockResolvedValue('other');
      await expect(svc.refresh({ userId: 'u', refreshToken: 't' })).rejects.toThrow(
        'Invalid refresh',
      );
    });
    it('rejects missing user, succeeds otherwise', async () => {
      const { createHash } = await import('crypto');
      redis.get.mockResolvedValue(createHash('sha256').update('t').digest('hex'));
      model.findById.mockResolvedValue(null);
      await expect(svc.refresh({ userId: 'u', refreshToken: 't' })).rejects.toThrow(
        'User not found',
      );
      model.findById.mockResolvedValue({ _id: 'u', email: 'e', role: 'user' });
      const r = await svc.refresh({ userId: 'u', refreshToken: 't' });
      expect(r.accessToken).toBeDefined();
    });
  });
});
