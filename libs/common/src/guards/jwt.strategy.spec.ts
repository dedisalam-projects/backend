import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { JwtStrategy, extractJwtFromAuthOrCookie, RequestWithCookies } from './jwt.strategy';
import { JwtPayload } from '../interfaces';

describe('JwtStrategy', () => {
  let configService: { get: jest.Mock };
  let mockRedis: { get: jest.Mock };

  beforeEach(() => {
    configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };
    mockRedis = {
      get: jest.fn(),
    };
  });

  describe('extractJwtFromAuthOrCookie', () => {
    it('should extract token from Bearer authorization header', () => {
      const req = {
        headers: {
          authorization: 'Bearer bearer-token-123',
        },
      };
      expect(extractJwtFromAuthOrCookie(req as unknown as RequestWithCookies)).toBe(
        'bearer-token-123',
      );
    });

    it('should extract token from req.cookies.accessToken when auth header is missing', () => {
      const req = {
        headers: {},
        cookies: {
          accessToken: 'cookie-token-456',
        },
      };
      expect(extractJwtFromAuthOrCookie(req as unknown as RequestWithCookies)).toBe(
        'cookie-token-456',
      );
    });

    it('should return null when token cannot be extracted', () => {
      const req = {
        headers: {},
      };
      expect(extractJwtFromAuthOrCookie(req as unknown as RequestWithCookies)).toBeNull();
    });

    it('should return null when req or req.cookies is undefined', () => {
      expect(extractJwtFromAuthOrCookie(null as unknown as RequestWithCookies)).toBeNull();
      expect(extractJwtFromAuthOrCookie({} as unknown as RequestWithCookies)).toBeNull();
    });
  });

  describe('constructor', () => {
    it('should use JWT_SECRET from configService if available', () => {
      const strategy = new JwtStrategy(
        configService as unknown as ConfigService,
        mockRedis as unknown as Redis,
      );
      expect(strategy).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
    });

    it('should fallback to default secret if JWT_SECRET is not in configService', () => {
      configService.get.mockReturnValueOnce(null);
      const strategy = new JwtStrategy(configService as unknown as ConfigService);
      expect(strategy).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should throw UnauthorizedException when payload is null or falsy', async () => {
      const strategy = new JwtStrategy(
        configService as unknown as ConfigService,
        mockRedis as unknown as Redis,
      );
      await expect(
        strategy.validate({} as RequestWithCookies, null as unknown as JwtPayload),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return payload directly when redis is not provided', async () => {
      const strategy = new JwtStrategy(configService as unknown as ConfigService);
      const payload = { sub: 'u1', email: 'u1@test.com' };
      const result = await strategy.validate({} as RequestWithCookies, payload);
      expect(result).toBe(payload);
    });

    it('should throw UnauthorizedException when token is blacklisted in redis', async () => {
      mockRedis.get.mockResolvedValue('true');
      const strategy = new JwtStrategy(
        configService as unknown as ConfigService,
        mockRedis as unknown as Redis,
      );
      const req = {
        headers: {
          authorization: 'Bearer blacklisted-token',
        },
      };
      await expect(
        strategy.validate(req as unknown as RequestWithCookies, { sub: 'u1' }),
      ).rejects.toThrow(new UnauthorizedException('Token has been revoked'));
      expect(mockRedis.get).toHaveBeenCalledWith('blacklist:blacklisted-token');
    });

    it('should return payload when token is not blacklisted in redis', async () => {
      mockRedis.get.mockResolvedValue(null);
      const strategy = new JwtStrategy(
        configService as unknown as ConfigService,
        mockRedis as unknown as Redis,
      );
      const req = {
        cookies: {
          accessToken: 'valid-cookie-token',
        },
      };
      const payload = { sub: 'u1' };
      const result = await strategy.validate(req as unknown as RequestWithCookies, payload);
      expect(result).toBe(payload);
      expect(mockRedis.get).toHaveBeenCalledWith('blacklist:valid-cookie-token');
    });

    it('should return payload when redis is provided but no token is found on request', async () => {
      const strategy = new JwtStrategy(
        configService as unknown as ConfigService,
        mockRedis as unknown as Redis,
      );
      const req = { headers: {} };
      const payload = { sub: 'u1' };
      const result = await strategy.validate(req as unknown as RequestWithCookies, payload);
      expect(result).toBe(payload);
      expect(mockRedis.get).not.toHaveBeenCalled();
    });
  });
});
