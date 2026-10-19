import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getModelToken } from '@nestjs/mongoose';
import { User, RedisService } from '@dedisalam/database';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { createHash } from 'crypto';

describe('AuthService (auth-service)', () => {
  let service: AuthService;
  let mockUserModel: {
    findOne: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
    countDocuments: jest.Mock;
  };
  let mockRedisService: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let mockConfigService: { get: jest.Mock };
  let mockNotificationClient: { emit: jest.Mock };

  beforeEach(async () => {
    mockUserModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      countDocuments: jest.fn(),
    };

    mockRedisService = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
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
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'NOTIFICATION_SERVICE_RMQ',
          useValue: mockNotificationClient,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onApplicationBootstrap', () => {
    it('should create superadmin if none exists', async () => {
      mockUserModel.countDocuments.mockResolvedValue(0);
      mockUserModel.create.mockResolvedValue({ email: 'superadmin@example.com' });

      await service.onApplicationBootstrap();

      expect(mockUserModel.countDocuments).toHaveBeenCalledWith({ role: 'super_admin' });
      expect(mockUserModel.create).toHaveBeenCalled();
    });

    it('should skip creation if superadmin already exists', async () => {
      mockUserModel.countDocuments.mockResolvedValue(1);

      await service.onApplicationBootstrap();

      expect(mockUserModel.create).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully during bootstrap', async () => {
      mockUserModel.countDocuments.mockRejectedValue(new Error('DB Connection Error'));

      await expect(service.onApplicationBootstrap()).resolves.not.toThrow();
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue({
        _id: 'user-123',
        email: 'test@example.com',
        name: 'Test',
        role: 'user',
        isActive: true,
      });

      const res = await service.register({
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test',
      });

      expect(res.user.email).toBe('test@example.com');
      expect(res.message).toBe('User registered successfully');
    });

    it('should throw BadRequestException if user already exists', async () => {
      mockUserModel.findOne.mockResolvedValue({ email: 'test@example.com' });

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password123!',
          name: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should login user and return tokens when credentials are valid', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'user-123',
          email: 'test@example.com',
          password: hashedPassword,
          name: 'Test',
          role: 'user',
          isActive: true,
        }),
      });

      const res = await service.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(res.user.email).toBe('test@example.com');
      expect(res.accessToken).toBeDefined();
      expect(res.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      const hashedPassword = await bcrypt.hash('OtherPassword123!', 10);
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'user-123',
          email: 'test@example.com',
          password: hashedPassword,
        }),
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUserModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

      await expect(
        service.login({
          email: 'notfound@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens when refreshToken matches stored hash', async () => {
      const validRefreshToken = 'valid-refresh-token';
      const tokenHash = createHash('sha256').update(validRefreshToken).digest('hex');
      mockRedisService.get.mockResolvedValue(tokenHash);

      mockUserModel.findById.mockResolvedValue({
        _id: 'user-123',
        email: 'test@example.com',
        name: 'Test',
        role: 'user',
        isActive: true,
      });

      const res = await service.refresh({
        userId: 'user-123',
        refreshToken: validRefreshToken,
      });

      expect(res.accessToken).toBeDefined();
      expect(res.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException if redis has no token hash', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(
        service.refresh({
          userId: 'user-123',
          refreshToken: 'any-token',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token hash does not match', async () => {
      mockRedisService.get.mockResolvedValue('wrong-hash');

      await expect(
        service.refresh({
          userId: 'user-123',
          refreshToken: 'any-token',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should delete token from redis and return success', async () => {
      const res = await service.logout('user-123');
      expect(mockRedisService.del).toHaveBeenCalledWith('refresh_token:user-123');
      expect(res).toEqual({ success: true, message: 'Logged out successfully' });
    });

    it('should handle missing userId gracefully in logout', async () => {
      const res = await service.logout('');
      expect(mockRedisService.del).not.toHaveBeenCalled();
      expect(res).toEqual({ success: true, message: 'Logged out successfully' });
    });
  });
});
