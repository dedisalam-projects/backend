import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  let mockUserService: { send: jest.Mock };
  let mockConfigService: { get: jest.Mock };
  let mockResponse: any;

  const jwtSecret = 'test-secret';

  beforeEach(async () => {
    mockUserService = {
      send: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'COOKIE_DOMAIN') return '.dedisalam.my.id';
        if (key === 'REFRESH_COOKIE_PATH') return '/api/v1/auth';
        return null;
      }),
    };

    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: 'USER_SERVICE', useValue: mockUserService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('login', () => {
    it('should authenticate user and set cookies in development (undefined domain)', async () => {
      const loginDto = { email: 'test@example.com', password: 'Password123!' };
      const authResult = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        user: { id: 'u1', email: 'test@example.com' },
      };
      mockUserService.send.mockReturnValue(of(authResult));

      const result = await controller.login(loginDto, mockResponse);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(authResult);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'accessToken',
        'access-token-123',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          domain: undefined,
          path: '/',
          maxAge: 15 * 60 * 1000,
        }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token-123',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          domain: undefined,
          path: '/api/v1/auth',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );
    });

    it('should set secure wildcard cookie in production', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'COOKIE_DOMAIN') return '.dedisalam.my.id';
        return null;
      });

      const loginDto = { email: 'test@example.com', password: 'Password123!' };
      const authResult = {
        accessToken: 'access-token-prod',
        refreshToken: 'refresh-token-prod',
      };
      mockUserService.send.mockReturnValue(of(authResult));

      await controller.login(loginDto, mockResponse);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'accessToken',
        'access-token-prod',
        expect.objectContaining({
          secure: true,
          domain: '.dedisalam.my.id',
        }),
      );
    });

    it('should use default .dedisalam.my.id when COOKIE_DOMAIN is unconfigured in production', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return null;
      });

      const loginDto = { email: 'test@example.com', password: 'Password123!' };
      const authResult = { accessToken: 'a1', refreshToken: 'r1' };
      mockUserService.send.mockReturnValue(of(authResult));

      await controller.login(loginDto, mockResponse);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'accessToken',
        'a1',
        expect.objectContaining({
          secure: true,
          domain: '.dedisalam.my.id',
        }),
      );
    });

    it('should handle response when tokens are missing without setting cookies', async () => {
      mockUserService.send.mockReturnValue(of({ user: { id: 'u1' } }));
      const result = await controller.login({ email: 't@t.com', password: 'p' }, mockResponse);
      expect(result.success).toBe(true);
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it('should fallback to default /api/v1/auth when REFRESH_COOKIE_PATH is unset', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return null;
      });

      const loginDto = { email: 'test@example.com', password: 'Password123!' };
      mockUserService.send.mockReturnValue(of({ refreshToken: 'r-default' }));

      await controller.login(loginDto, mockResponse);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'r-default',
        expect.objectContaining({ path: '/api/v1/auth' }),
      );
    });

    it('should rethrow HttpException when userService throws an HttpException', async () => {
      const err = new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
      mockUserService.send.mockReturnValue(throwError(() => err));

      await expect(
        controller.login({ email: 'wrong@test.com', password: 'bad' }, mockResponse),
      ).rejects.toThrow(err);
    });

    it('should wrap generic error in HttpException with 500 status', async () => {
      mockUserService.send.mockReturnValue(throwError(() => new Error('Connection failed')));

      await expect(
        controller.login({ email: 'wrong@test.com', password: 'bad' }, mockResponse),
      ).rejects.toThrow(HttpException);
    });

    it('should handle error without message and status', async () => {
      mockUserService.send.mockReturnValue(throwError(() => ({})));

      await expect(
        controller.login({ email: 'wrong@test.com', password: 'bad' }, mockResponse),
      ).rejects.toThrow('Internal Server Error');
    });
  });

  describe('register', () => {
    it('should register user and return response', async () => {
      const registerDto = { email: 'new@test.com', password: 'Password123!', name: 'New User' };
      const registeredUser = { id: 'u2', email: 'new@test.com', name: 'New User' };
      mockUserService.send.mockReturnValue(of(registeredUser));

      const result = await controller.register(registerDto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(registeredUser);
      expect(result.message).toBe('User registered successfully');
    });

    it('should rethrow HttpException if thrown by userService', async () => {
      const httpErr = new HttpException('User already exists', HttpStatus.BAD_REQUEST);
      mockUserService.send.mockReturnValue(throwError(() => httpErr));

      await expect(
        controller.register({ email: 'exists@test.com', password: 'p', name: 'n' }),
      ).rejects.toThrow(httpErr);
    });

    it('should wrap generic error into HttpException', async () => {
      mockUserService.send.mockReturnValue(throwError(() => new Error('DB error')));

      await expect(
        controller.register({ email: 'test@test.com', password: 'p', name: 'n' }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens using cookies and rotate cookie tokens', async () => {
      const req: any = {
        cookies: {
          refreshToken: 'cookie-refresh-token',
        },
        headers: {},
      };
      const body = { userId: 'u123' };
      const refreshResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      mockUserService.send.mockReturnValue(of(refreshResult));

      const result = await controller.refresh(req, body, mockResponse);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(refreshResult);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'accessToken',
        'new-access-token',
        expect.any(Object),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'new-refresh-token',
        expect.any(Object),
      );
    });

    it('should extract userId from accessToken cookie if body.userId is omitted', async () => {
      const validToken = jwt.sign({ sub: 'user-from-cookie' }, jwtSecret);
      const req: any = {
        cookies: {
          refreshToken: 'refresh-abc',
          accessToken: validToken,
        },
        headers: {},
      };
      mockUserService.send.mockReturnValue(of({ accessToken: 'a2', refreshToken: 'r2' }));

      const result = await controller.refresh(req, {}, mockResponse);

      expect(result.success).toBe(true);
      expect(mockUserService.send).toHaveBeenCalledWith('auth.refresh', {
        userId: 'user-from-cookie',
        refreshToken: 'refresh-abc',
      });
    });

    it('should extract userId from authorization header if accessToken cookie is omitted', async () => {
      const validToken = jwt.sign({ userId: 'user-from-header' }, jwtSecret);
      const req: any = {
        cookies: {
          refreshToken: 'refresh-abc',
        },
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      };
      mockUserService.send.mockReturnValue(of({}));

      const result = await controller.refresh(req, {}, mockResponse);

      expect(result.success).toBe(true);
      expect(mockUserService.send).toHaveBeenCalledWith('auth.refresh', {
        userId: 'user-from-header',
        refreshToken: 'refresh-abc',
      });
    });

    it('should throw UnauthorizedException if refreshToken is missing', async () => {
      const req: any = { cookies: {}, headers: {} };
      await expect(controller.refresh(req, { userId: 'u1' }, mockResponse)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if userId cannot be resolved', async () => {
      const req: any = { cookies: { refreshToken: 'token' }, headers: {} };
      await expect(controller.refresh(req, {}, mockResponse)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should rethrow HttpException if thrown during refresh', async () => {
      const req: any = { cookies: { refreshToken: 'bad' }, headers: {} };
      const httpErr = new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
      mockUserService.send.mockReturnValue(throwError(() => httpErr));

      await expect(controller.refresh(req, { userId: 'u1' }, mockResponse)).rejects.toThrow(
        httpErr,
      );
    });

    it('should wrap generic error during refresh', async () => {
      const req: any = { cookies: { refreshToken: 'bad' }, headers: {} };
      mockUserService.send.mockReturnValue(throwError(() => new Error('Redis down')));

      await expect(controller.refresh(req, { userId: 'u1' }, mockResponse)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('logout', () => {
    it('should logout and clear cookies across all paths', async () => {
      const req: any = {
        cookies: {
          refreshToken: 'cookie-r',
          accessToken: 'cookie-a',
        },
        headers: {},
      };
      mockUserService.send.mockReturnValue(of({ message: 'Logged out successfully' }));

      const result = await controller.logout(req, {}, mockResponse);

      expect(result.success).toBe(true);
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('accessToken', expect.any(Object));
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
    });

    it('should extract tokens and userId from body or headers if cookies missing', async () => {
      const validToken = jwt.sign({ sub: 'user-logout' }, jwtSecret);
      const req: any = {
        cookies: {},
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      };
      mockUserService.send.mockReturnValue(of({ message: 'Logged out successfully' }));

      await controller.logout(req, { refreshToken: 'body-r' }, mockResponse);

      expect(mockUserService.send).toHaveBeenCalledWith('auth.logout', {
        refreshToken: 'body-r',
        accessToken: validToken,
        userId: 'user-logout',
      });
    });

    it('should extract userId with userId field from token during logout', async () => {
      const validToken = jwt.sign({ userId: 'user-logout-2' }, jwtSecret);
      const req: any = {
        cookies: { accessToken: validToken },
        headers: {},
      };
      mockUserService.send.mockReturnValue(of({ message: 'Logged out' }));

      await controller.logout(req, {}, mockResponse);

      expect(mockUserService.send).toHaveBeenCalledWith('auth.logout', {
        refreshToken: '',
        accessToken: validToken,
        userId: 'user-logout-2',
      });
    });

    it('should handle logout when body provides accessToken and userId directly', async () => {
      const req: any = { cookies: {}, headers: {} };
      mockUserService.send.mockReturnValue(of({ message: 'Logged out' }));

      await controller.logout(
        req,
        { refreshToken: 'r', accessToken: 'a', userId: 'direct-u' },
        mockResponse,
      );

      expect(mockUserService.send).toHaveBeenCalledWith('auth.logout', {
        refreshToken: 'r',
        accessToken: 'a',
        userId: 'direct-u',
      });
    });

    it('should rethrow HttpException during logout', async () => {
      const req: any = { cookies: {}, headers: {} };
      const httpErr = new HttpException('Logout error', HttpStatus.BAD_REQUEST);
      mockUserService.send.mockReturnValue(throwError(() => httpErr));

      await expect(controller.logout(req, {}, mockResponse)).rejects.toThrow(httpErr);
    });

    it('should wrap generic error during logout', async () => {
      const req: any = { cookies: {}, headers: {} };
      mockUserService.send.mockReturnValue(throwError(() => new Error('Error')));

      await expect(controller.logout(req, {}, mockResponse)).rejects.toThrow(HttpException);
    });
  });
});
