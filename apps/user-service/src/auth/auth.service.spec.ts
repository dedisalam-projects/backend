import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getModelToken } from '@nestjs/mongoose';
import { User, UserDocument, RedisService } from '@dedisalam/database';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { Model } from 'mongoose';
import { ClientProxy } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { createHash } from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserModel: {
    findOne: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
    find: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
    countDocuments: jest.Mock;
  };
  let mockRedisService: { get: jest.Mock; set: jest.Mock };
  let mockConfigService: { get: jest.Mock };
  let mockNotificationClient: { emit: jest.Mock };

  beforeEach(async () => {
    mockUserModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
    };

    mockRedisService = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'super-secret-jwt-key';
        return null;
      }),
    };

    mockNotificationClient = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'NOTIFICATION_SERVICE_RMQ', useValue: mockNotificationClient },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('constructor', () => {
    it('should throw error when JWT_SECRET is not defined', () => {
      mockConfigService.get.mockReturnValueOnce(null);
      expect(() => {
        new AuthService(
          mockUserModel as unknown as Model<UserDocument>,
          mockRedisService as unknown as RedisService,
          mockConfigService as unknown as ConfigService,
          mockNotificationClient as unknown as ClientProxy,
        );
      }).toThrow('FATAL: JWT_SECRET environment variable is not defined');
    });
  });

  describe('onApplicationBootstrap', () => {
    it('should initialize default superadmin when count is 0 with default config', async () => {
      mockUserModel.countDocuments.mockResolvedValueOnce(0);
      mockUserModel.create.mockResolvedValueOnce({
        _id: 'sa-1',
        email: 'superadmin@example.com',
      });

      await service.onApplicationBootstrap();

      expect(mockUserModel.countDocuments).toHaveBeenCalled();
      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'superadmin@example.com',
          name: 'Super Administrator',
          role: 'super_admin',
          isActive: true,
        }),
      );
    });

    it('should initialize superadmin using configured email and password when provided', async () => {
      mockUserModel.countDocuments.mockResolvedValueOnce(0);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'DEFAULT_SUPERADMIN_EMAIL') return 'custom-admin@example.com';
        if (key === 'DEFAULT_SUPERADMIN_PASSWORD') return 'CustomPass123!';
        return 'super-secret-jwt-key';
      });

      await service.onApplicationBootstrap();

      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'custom-admin@example.com',
          role: 'super_admin',
        }),
      );
    });

    it('should skip creation when superadmin already exists', async () => {
      mockUserModel.countDocuments.mockResolvedValueOnce(1);

      await service.onApplicationBootstrap();

      expect(mockUserModel.create).not.toHaveBeenCalled();
    });

    it('should catch error and log when error occurs during bootstrap', async () => {
      mockUserModel.countDocuments.mockRejectedValueOnce(new Error('DB Connection Failed'));

      await expect(service.onApplicationBootstrap()).resolves.not.toThrow();
    });
  });

  describe('register', () => {
    it('should throw BadRequestException if required fields are missing', async () => {
      await expect(service.register({ email: '', password: '123', name: 'A' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register({ email: 'a@b.com', password: '', name: 'A' })).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        service.register({ email: 'a@b.com', password: '123', name: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user already exists', async () => {
      mockUserModel.findOne.mockResolvedValueOnce({ _id: 'u1' });
      await expect(
        service.register({ email: 'existing@b.com', password: '123', name: 'Existing' }),
      ).rejects.toThrow('User already exists');
    });

    it('should register new user with default role "user" and emit user.created', async () => {
      mockUserModel.findOne.mockResolvedValueOnce(null);
      mockUserModel.create.mockResolvedValueOnce({
        _id: 'new-u1',
        email: 'new@b.com',
        name: 'New User',
        role: 'user',
      });

      const result = await service.register({
        email: 'new@b.com',
        password: 'password123',
        name: 'New User',
      });

      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@b.com',
          name: 'New User',
          role: 'user',
        }),
      );
      expect(mockNotificationClient.emit).toHaveBeenCalledWith(
        'user.created',
        expect.objectContaining({
          userId: 'new-u1',
          name: 'New User',
        }),
      );
      expect(result.message).toBe('User registered successfully');
      expect(result.user.id).toBe('new-u1');
    });

    it('should register new user with custom role if provided', async () => {
      mockUserModel.findOne.mockResolvedValueOnce(null);
      mockUserModel.create.mockResolvedValueOnce({
        _id: 'admin-1',
        email: 'admin@b.com',
        name: 'Admin User',
        role: 'admin',
      });

      await service.register({
        email: 'admin@b.com',
        password: 'pass',
        name: 'Admin User',
        role: 'admin',
      });

      expect(mockUserModel.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'admin' }));
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user is not found', async () => {
      mockUserModel.findOne.mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce(null),
      });

      await expect(service.login({ email: 'notfound@b.com', password: 'pass' })).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hashed = await bcrypt.hash('correct-pass', 10);
      mockUserModel.findOne.mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce({ email: 'user@b.com', password: hashed }),
      });

      await expect(service.login({ email: 'user@b.com', password: 'wrong-pass' })).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should sign tokens, store refresh token in Redis, emit event, and return payload', async () => {
      const hashed = await bcrypt.hash('secret123', 10);
      const user = {
        _id: 'u-123',
        email: 'user@b.com',
        name: 'John',
        role: 'user',
        password: hashed,
      };
      mockUserModel.findOne.mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce(user),
      });

      const result = await service.login({ email: 'user@b.com', password: 'secret123' });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toEqual({
        id: 'u-123',
        email: 'user@b.com',
        name: 'John',
        role: 'user',
      });
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'refresh_token:u-123',
        expect.any(String),
        7 * 24 * 60 * 60,
      );
      expect(mockNotificationClient.emit).toHaveBeenCalledWith(
        'user.logged_in',
        expect.objectContaining({
          userId: 'u-123',
          email: 'user@b.com',
        }),
      );
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException if userId or refreshToken is missing', async () => {
      await expect(service.refresh({ userId: '', refreshToken: 'tok' })).rejects.toThrow(
        'Missing refresh token or userId',
      );
      await expect(service.refresh({ userId: 'u1', refreshToken: '' })).rejects.toThrow(
        'Missing refresh token or userId',
      );
    });

    it('should throw UnauthorizedException if stored token is missing or does not match', async () => {
      mockRedisService.get.mockResolvedValueOnce(null);
      await expect(service.refresh({ userId: 'u1', refreshToken: 'incoming' })).rejects.toThrow(
        'Invalid refresh token',
      );

      mockRedisService.get.mockResolvedValueOnce('different-hashed-token');
      await expect(service.refresh({ userId: 'u1', refreshToken: 'incoming' })).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException if user does not exist in DB', async () => {
      const rawToken = 'valid-token';
      const hashed = createHash('sha256').update(rawToken).digest('hex');
      mockRedisService.get.mockResolvedValueOnce(hashed);
      mockUserModel.findById.mockResolvedValueOnce(null);

      await expect(service.refresh({ userId: 'u1', refreshToken: rawToken })).rejects.toThrow(
        'User not found',
      );
    });

    it('should rotate refresh token and return new token pair', async () => {
      const rawToken = 'valid-token';
      const hashed = createHash('sha256').update(rawToken).digest('hex');
      mockRedisService.get.mockResolvedValueOnce(hashed);
      mockUserModel.findById.mockResolvedValueOnce({
        _id: 'u1',
        email: 'u1@b.com',
        role: 'admin',
      });

      const result = await service.refresh({ userId: 'u1', refreshToken: rawToken });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe(rawToken);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'refresh_token:u1',
        expect.any(String),
        7 * 24 * 60 * 60,
      );
    });
  });

  describe('getProfile', () => {
    it('should throw BadRequestException if user not found', async () => {
      mockUserModel.findById.mockResolvedValueOnce(null);
      await expect(service.getProfile('unknown')).rejects.toThrow('User not found');
    });

    it('should return sanitized user profile', async () => {
      mockUserModel.findById.mockResolvedValueOnce({
        _id: 'u1',
        email: 'u1@b.com',
        name: 'Alice',
        role: 'user',
        isActive: true,
      });

      const result = await service.getProfile('u1');
      expect(result).toEqual({
        id: 'u1',
        email: 'u1@b.com',
        name: 'Alice',
        role: 'user',
        isActive: true,
      });
    });
  });

  describe('getAllUsers', () => {
    it('should return all users mapped to profile objects', async () => {
      mockUserModel.find.mockResolvedValueOnce([
        { _id: 'u1', email: 'u1@b.com', name: 'User 1', role: 'user', isActive: true },
        { _id: 'u2', email: 'u2@b.com', name: 'User 2', role: 'admin', isActive: false },
      ]);

      const result = await service.getAllUsers();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('u1');
      expect(result[1].role).toBe('admin');
    });
  });

  describe('logout', () => {
    it('should blacklist accessToken when valid with remaining TTL and clear refresh token', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 300; // 5 min in future
      const token = jwt.sign({ sub: 'u1', exp: futureExp }, 'secret');

      const result = await service.logout({
        accessToken: token,
        refreshToken: 'some-refresh',
        userId: 'u1',
      });

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `blacklist:${token}`,
        'true',
        expect.any(Number),
      );
      expect(mockRedisService.set).toHaveBeenCalledWith('refresh_token:u1', '', 1);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should handle expired accessToken and omitted userId gracefully', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 300; // 5 min ago
      const token = jwt.sign({ sub: 'u1', exp: pastExp }, 'secret');

      const result = await service.logout({ accessToken: token });

      expect(mockRedisService.set).not.toHaveBeenCalledWith(
        `blacklist:${token}`,
        'true',
        expect.any(Number),
      );
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should handle missing accessToken and decode returning null', async () => {
      const result = await service.logout({ accessToken: 'invalid.jwt.token' });
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should handle logout without accessToken', async () => {
      const result = await service.logout({ userId: 'u1' });
      expect(mockRedisService.set).toHaveBeenCalledWith('refresh_token:u1', '', 1);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('updateProfile', () => {
    it('should throw BadRequestException if userId is missing', async () => {
      await expect(service.updateProfile({})).rejects.toThrow('userId is required');
    });

    it('should update name and password, then return updated user', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValueOnce({
        _id: 'u1',
        email: 'u1@b.com',
        name: 'New Name',
        role: 'user',
        isActive: true,
      });

      const result = await service.updateProfile({
        userId: 'u1',
        name: 'New Name',
        password: 'new-password-123',
      });

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({
          name: 'New Name',
          password: expect.any(String),
        }),
        { new: true },
      );
      expect(result.name).toBe('New Name');
    });

    it('should throw BadRequestException if user not found on update', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValueOnce(null);
      await expect(service.updateProfile({ userId: 'u1', name: 'Name' })).rejects.toThrow(
        'User not found',
      );
    });

    it('should update only password when name is omitted', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValueOnce({
        _id: 'u1',
        email: 'u1@b.com',
        name: 'Existing Name',
        role: 'user',
        isActive: true,
      });

      const result = await service.updateProfile({
        userId: 'u1',
        password: 'only-password-change',
      });

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'u1',
        expect.not.objectContaining({ name: expect.anything() }),
        { new: true },
      );
      expect(result.id).toBe('u1');
    });
  });

  describe('createUser', () => {
    it('should throw BadRequestException if required fields missing', async () => {
      await expect(service.createUser({ email: '', password: 'p', name: 'N' })).rejects.toThrow(
        'Email, password, and name are required',
      );
    });

    it('should throw BadRequestException if user already exists', async () => {
      mockUserModel.findOne.mockResolvedValueOnce({ _id: 'u-dup' });
      await expect(
        service.createUser({ email: 'dup@b.com', password: 'p', name: 'N' }),
      ).rejects.toThrow('User already exists');
    });

    it('should create user with provided role, emit notification, and return created user', async () => {
      mockUserModel.findOne.mockResolvedValueOnce(null);
      const createdUser = {
        _id: 'u-new',
        email: 'new@b.com',
        name: 'New Person',
        role: 'moderator',
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      };
      mockUserModel.create.mockResolvedValueOnce(createdUser);

      const result = await service.createUser({
        email: 'new@b.com',
        password: 'pass',
        name: 'New Person',
        role: 'moderator',
      });

      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@b.com',
          role: 'moderator',
          isActive: true,
        }),
      );
      expect(mockNotificationClient.emit).toHaveBeenCalledWith(
        'user.created',
        expect.objectContaining({
          userId: 'u-new',
          name: 'New Person',
          email: 'new@b.com',
          role: 'moderator',
          user: expect.objectContaining({
            id: 'u-new',
            name: 'New Person',
            email: 'new@b.com',
            role: 'moderator',
          }),
        }),
      );
      expect(result.id).toBe('u-new');
      expect(result.role).toBe('moderator');
    });

    it('should default role to "user" when not provided', async () => {
      mockUserModel.findOne.mockResolvedValueOnce(null);
      mockUserModel.create.mockResolvedValueOnce({
        _id: 'u-default',
        email: 'def@b.com',
        name: 'Default Person',
        role: 'user',
        isActive: true,
      });

      await service.createUser({
        email: 'def@b.com',
        password: 'pass',
        name: 'Default Person',
      });

      expect(mockUserModel.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'user' }));
    });
  });

  describe('getUsersPaginated', () => {
    it('should apply pagination, search regex, and role filter', async () => {
      mockUserModel.countDocuments.mockResolvedValueOnce(25);
      const mockChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([
          {
            _id: 'u-p1',
            email: 'search@b.com',
            name: 'Search Match',
            role: 'admin',
            isActive: true,
            createdAt: new Date('2026-01-01'),
          },
        ]),
      };
      mockUserModel.find.mockReturnValueOnce(mockChain);

      const result = await service.getUsersPaginated({
        page: '2',
        limit: '10',
        search: 'search',
        role: 'admin',
      });

      expect(mockUserModel.countDocuments).toHaveBeenCalledWith({
        $or: [
          { name: { $regex: 'search', $options: 'i' } },
          { email: { $regex: 'search', $options: 'i' } },
        ],
        role: 'admin',
      });
      expect(mockChain.skip).toHaveBeenCalledWith(10);
      expect(mockChain.limit).toHaveBeenCalledWith(10);
      expect(result.items).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
    });

    it('should handle zero total and default query parameters', async () => {
      mockUserModel.countDocuments.mockResolvedValueOnce(0);
      const mockChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce([]),
      };
      mockUserModel.find.mockReturnValueOnce(mockChain);

      const result = await service.getUsersPaginated({});

      expect(mockUserModel.countDocuments).toHaveBeenCalledWith({});
      expect(result.items).toEqual([]);
      expect(result.meta).toEqual({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('updateUserByAdmin', () => {
    it('should throw BadRequestException if userId is missing', async () => {
      await expect(service.updateUserByAdmin('', {})).rejects.toThrow('userId is required');
    });

    it('should update all allowed fields (name, role, isActive, password) and return updated user', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValueOnce({
        _id: 'u-target',
        email: 'target@b.com',
        name: 'Updated Name',
        role: 'admin',
        isActive: false,
        updatedAt: new Date('2026-01-02'),
      });

      const result = await service.updateUserByAdmin('u-target', {
        name: 'Updated Name',
        role: 'admin',
        isActive: false,
        password: 'new-secret-pass',
      });

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'u-target',
        expect.objectContaining({
          name: 'Updated Name',
          role: 'admin',
          isActive: false,
          password: expect.any(String),
        }),
        { new: true },
      );
      expect(result.id).toBe('u-target');
      expect(result.isActive).toBe(false);
      expect(mockNotificationClient.emit).toHaveBeenCalledWith(
        'user.updated',
        expect.objectContaining({
          userId: 'u-target',
          changes: expect.objectContaining({
            name: 'Updated Name',
            role: 'admin',
            isActive: false,
          }),
          timestamp: expect.any(String),
        }),
      );
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValueOnce(null);
      await expect(service.updateUserByAdmin('missing-u', { name: 'Something' })).rejects.toThrow(
        'User not found',
      );
    });

    it('should update only role when other fields are omitted', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValueOnce({
        _id: 'u-target',
        email: 'target@b.com',
        name: 'Target Name',
        role: 'super_admin',
        isActive: true,
      });

      const result = await service.updateUserByAdmin('u-target', {
        role: 'super_admin',
      });

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'u-target',
        { role: 'super_admin' },
        { new: true },
      );
      expect(result.role).toBe('super_admin');
      expect(mockNotificationClient.emit).toHaveBeenCalledWith(
        'user.updated',
        expect.objectContaining({
          userId: 'u-target',
          changes: { role: 'super_admin' },
          timestamp: expect.any(String),
        }),
      );
    });

    it('should update only name and isActive when role is omitted', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValueOnce({
        _id: 'u-target',
        email: 'target@b.com',
        name: 'Target Name',
        role: 'user',
        isActive: false,
      });

      await service.updateUserByAdmin('u-target', {
        name: 'New Name',
        isActive: false,
      });

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'u-target',
        expect.objectContaining({ name: 'New Name', isActive: false }),
        { new: true },
      );
      expect(mockNotificationClient.emit).toHaveBeenCalledWith(
        'user.updated',
        expect.objectContaining({
          userId: 'u-target',
          changes: { name: 'New Name', isActive: false },
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('deleteUser', () => {
    it('should throw BadRequestException if userId is missing', async () => {
      await expect(service.deleteUser('')).rejects.toThrow('userId is required');
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUserModel.findByIdAndDelete.mockResolvedValueOnce(null);
      await expect(service.deleteUser('missing-u')).rejects.toThrow('User not found');
    });

    it('should delete user from DB, clear refresh token in Redis, and return success message', async () => {
      mockUserModel.findByIdAndDelete.mockResolvedValueOnce({ _id: 'u-del' });

      const result = await service.deleteUser('u-del');

      expect(mockUserModel.findByIdAndDelete).toHaveBeenCalledWith('u-del');
      expect(mockRedisService.set).toHaveBeenCalledWith('refresh_token:u-del', '', 1);
      expect(mockNotificationClient.emit).toHaveBeenCalledWith(
        'user.deleted',
        expect.objectContaining({
          userId: 'u-del',
          timestamp: expect.any(String),
        }),
      );
      expect(result).toEqual({
        message: 'User deleted successfully',
        userId: 'u-del',
      });
    });
  });
});
