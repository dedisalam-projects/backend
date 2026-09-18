import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AuthResponseDto } from '@dedisalam/common';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  let mockUserService: { send: jest.Mock };
  let mockConfigService: { get: jest.Mock };
  let mockResponse: Response;
  let loggerSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const jwtSecret = 'test-secret';

  beforeEach(async () => {
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

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
    } as unknown as Response;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: 'USER_SERVICE', useValue: mockUserService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  function mockAndValidateAuthContract(payload: any) {
    const instance = plainToInstance(AuthResponseDto, payload);
    const errors = validateSync(instance as object, { skipMissingProperties: false });
    if (errors.length > 0) {
      throw new Error(`Contract violation in mock data: ${errors.toString()}`);
    }
    mockUserService.send.mockReturnValue(of(payload));
  }

  describe('login', () => {
    it('should authenticate user and set cookies in development (undefined domain)', async () => {
      const loginDto = { email: 'test@example.com', password: 'Password123!' };
      const authResult = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        user: { id: 'u1', email: 'test@example.com' },
      };
      mockAndValidateAuthContract(authResult);

      const result = await controller.login(loginDto, mockResponse);

      expect(mockUserService.send).toHaveBeenCalledWith('auth.login', loginDto);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Login successful');
      expect(result.meta).toBeDefined();
      expect(result.meta.timestamp).toBeDefined();
      expect(result.data).toEqual({ user: { id: 'u1', email: 'test@example.com' } });
      expect(result.data.accessToken).toBeUndefined();
      expect(result.data.refreshToken).toBeUndefined();
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'accessToken',
        'access-token-123',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          domain: undefined,
          path: '/',
          maxAge: 900000,
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
          maxAge: 604800000,
        }),
      );
      expect(loggerSpy).toHaveBeenCalledWith('Handling POST login for email: test@example.com');
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
      mockAndValidateAuthContract(authResult);

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
      mockAndValidateAuthContract(authResult);

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
      mockAndValidateAuthContract({ user: { id: 'u1', email: 'test@t.com' } });
      const result = await controller.login({ email: 't@t.com', password: 'p' }, mockResponse);
      expect(result.success).toBe(true);
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it('should handle nullish response gracefully in login', async () => {
      mockUserService.send.mockReturnValue(of(null));
      const result = await controller.login({ email: 't@t.com', password: 'p' }, mockResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it('should fallback to default /api/v1/auth when REFRESH_COOKIE_PATH is unset', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return null;
      });

      const loginDto = { email: 'test@example.com', password: 'Password123!' };
      mockAndValidateAuthContract({ refreshToken: 'r-default' });

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
      expect(loggerErrorSpy).toHaveBeenCalledWith('Error in login: Invalid credentials', err.stack);
    });

    it('should wrap generic error in HttpException with 500 status', async () => {
      mockUserService.send.mockReturnValue(throwError(() => new Error('Connection failed')));

      await expect(
        controller.login({ email: 'wrong@test.com', password: 'bad' }, mockResponse),
      ).rejects.toThrow(HttpException);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error in login: Connection failed',
        expect.any(String),
      );
    });

    it('should throw UnauthorizedException if header is not starting with Bearer', async () => {
      const req = {
        cookies: {},
        headers: { authorization: 'Something Bearer token-123' },
      } as unknown as Request;

      await expect(
        controller.refresh(req, { userId: '1' }, mockResponse as unknown as Response),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if header does not have space after Bearer', async () => {
      const req = {
        cookies: {},
        headers: { authorization: 'BearerToken-123' },
      } as unknown as Request;

      await expect(
        controller.refresh(req, { userId: '1' }, mockResponse as unknown as Response),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle error without message and status', async () => {
      mockUserService.send.mockReturnValue(throwError(() => ({})));

      await expect(
        controller.login({ email: 'wrong@test.com', password: 'bad' }, mockResponse),
      ).rejects.toThrow('Internal Server Error');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error in login: Internal Server Error',
        undefined,
      );
    });

    it('should map RMQ error with numeric statusCode 401 to HttpException with 401 status', async () => {
      mockUserService.send.mockReturnValue(
        throwError(() => ({ status: 'error', statusCode: 401, message: 'Invalid credentials' })),
      );

      const promise = controller.login({ email: 'wrong@test.com', password: 'bad' }, mockResponse);
      await expect(promise).rejects.toThrow(HttpException);
      await expect(promise).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        message: 'Invalid credentials',
      });
      expect(loggerErrorSpy).toHaveBeenCalledWith('Error in login: Invalid credentials', undefined);
    });

    it('should fallback to 500 without TypeError when RMQ returns string status "error"', async () => {
      mockUserService.send.mockReturnValue(
        throwError(() => ({ status: 'error', message: 'Something went wrong' })),
      );

      const promise = controller.login({ email: 'wrong@test.com', password: 'bad' }, mockResponse);
      await expect(promise).rejects.toThrow(HttpException);
      await expect(promise).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Something went wrong',
      });
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error in login: Something went wrong',
        undefined,
      );
    });

    it('should handle array error messages properly in RMQ error', async () => {
      mockUserService.send.mockReturnValue(
        throwError(() => ({
          status: 'error',
          statusCode: 400,
          message: ['email must be valid', 'password required'],
        })),
      );

      const promise = controller.login({ email: 'wrong@test.com', password: 'bad' }, mockResponse);
      await expect(promise).rejects.toThrow(HttpException);
      await expect(promise).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        message: 'email must be valid, password required',
      });
      // Since err itself is the payload here, err.message is an array, so errMessage was removed, and it uses message string.
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error in login: email must be valid, password required',
        undefined,
      );
    });

    it('should use numeric error.status when error.statusCode is absent', async () => {
      mockUserService.send.mockReturnValue(
        throwError(() => ({ status: HttpStatus.FORBIDDEN, message: 'Access denied' })),
      );

      const promise = controller.login({ email: 'wrong@test.com', password: 'bad' }, mockResponse);
      await expect(promise).rejects.toThrow(HttpException);
      await expect(promise).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
        message: 'Access denied',
      });
      expect(loggerErrorSpy).toHaveBeenCalledWith('Error in login: Access denied', undefined);
    });

    it('should extract statusCode and message from wrapped response object', async () => {
      mockUserService.send.mockReturnValue(
        throwError(() => ({
          response: {
            statusCode: HttpStatus.UNAUTHORIZED,
            message: 'Nested invalid credentials',
          },
        })),
      );

      const promise = controller.login({ email: 'wrong@test.com', password: 'bad' }, mockResponse);
      await expect(promise).rejects.toThrow(HttpException);
      await expect(promise).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        message: 'Nested invalid credentials',
      });
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error in login: Nested invalid credentials',
        undefined,
      );
    });

    it('should extract status and array message from wrapped error object', async () => {
      mockUserService.send.mockReturnValue(
        throwError(() => ({
          error: {
            status: HttpStatus.BAD_REQUEST,
            message: ['Nested error array'],
          },
        })),
      );

      const promise = controller.login({ email: 'wrong@test.com', password: 'bad' }, mockResponse);
      await expect(promise).rejects.toThrow(HttpException);
      await expect(promise).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        message: 'Nested error array',
      });
      expect(loggerErrorSpy).toHaveBeenCalledWith('Error in login: Nested error array', undefined);
    });

    it('should fallback to outer err status and message if nested payload lacks them', async () => {
      mockUserService.send.mockReturnValue(
        throwError(() => ({
          response: { someOtherField: true },
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          message: 'Outer message',
        })),
      );

      const promise = controller.login({ email: 'test@test.com', password: 'bad' }, mockResponse);
      await expect(promise).rejects.toThrow(HttpException);
      await expect(promise).rejects.toMatchObject({
        status: HttpStatus.PAYMENT_REQUIRED,
        message: 'Outer message',
      });
      expect(loggerErrorSpy).toHaveBeenCalledWith('Error in login: Outer message', undefined);
    });

    it('should fallback to outer err status and array message if nested payload lacks them', async () => {
      mockUserService.send.mockReturnValue(
        throwError(() => ({
          error: { someOtherField: true },
          status: HttpStatus.PAYMENT_REQUIRED,
          message: ['Outer message 1', 'Outer message 2'],
        })),
      );

      const promise = controller.login({ email: 'test@test.com', password: 'bad' }, mockResponse);
      await expect(promise).rejects.toThrow(HttpException);
      await expect(promise).rejects.toMatchObject({
        status: HttpStatus.PAYMENT_REQUIRED,
        message: 'Outer message 1, Outer message 2',
      });
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error in login: Outer message 1, Outer message 2',
        undefined,
      );
    });
  });

  describe('register', () => {
    it('should register user and return response', async () => {
      const registerDto = { email: 'new@test.com', password: 'Password123!', name: 'New User' };
      const registeredUser = {
        user: { id: 'u2', email: 'new@test.com', name: 'New User' },
        message: 'User registered successfully',
      };
      mockAndValidateAuthContract(registeredUser);

      const result = await controller.register(registerDto);

      expect(mockUserService.send).toHaveBeenCalledWith('auth.register', registerDto);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(registeredUser);
      expect(result.message).toBe('User registered successfully');
      expect(result.meta).toBeDefined();
      expect(result.meta.timestamp).toBeDefined();
      expect(loggerSpy).toHaveBeenCalledWith('Handling POST register for email: new@test.com');
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
      const req = {
        cookies: {
          refreshToken: 'cookie-refresh-token',
        },
        headers: {},
      } as unknown as Request;
      const body = { userId: 'u123' };
      const refreshResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      mockAndValidateAuthContract(refreshResult);

      const result = await controller.refresh(req, body, mockResponse as unknown as Response);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
      expect(result.data.accessToken).toBeUndefined();
      expect(result.data.refreshToken).toBeUndefined();
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'accessToken',
        'new-access-token',
        expect.objectContaining({
          path: '/',
          maxAge: 900000,
        }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'new-refresh-token',
        expect.objectContaining({
          path: '/api/v1/auth',
          maxAge: 604800000,
        }),
      );
      expect(result.message).toBe('Token refreshed successfully');
      expect(result.meta).toBeDefined();
      expect(result.meta.timestamp).toBeDefined();
      expect(loggerSpy).toHaveBeenCalledWith('Handling POST refresh for userId: u123');
    });

    it('should extract userId from accessToken cookie if body.userId is omitted', async () => {
      const validToken = jwt.sign({ sub: 'user-from-cookie' }, jwtSecret);
      const req = {
        cookies: {
          refreshToken: 'refresh-abc',
          accessToken: validToken,
        },
        headers: {},
      } as unknown as Request;
      mockAndValidateAuthContract({ accessToken: 'a2', refreshToken: 'r2' });

      const result = await controller.refresh(req, {}, mockResponse as unknown as Response);

      expect(result.success).toBe(true);
      expect(mockUserService.send).toHaveBeenCalledWith('auth.refresh', {
        userId: 'user-from-cookie',
        refreshToken: 'refresh-abc',
      });
    });

    it('should extract userId from authorization header if accessToken cookie is omitted', async () => {
      const validToken = jwt.sign({ userId: 'user-from-header' }, jwtSecret);
      const req = {
        cookies: {
          refreshToken: 'refresh-abc',
        },
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      } as unknown as Request;
      mockAndValidateAuthContract({});

      const result = await controller.refresh(req, {}, mockResponse as unknown as Response);

      expect(result.success).toBe(true);
      expect(mockUserService.send).toHaveBeenCalledWith('auth.refresh', {
        userId: 'user-from-header',
        refreshToken: 'refresh-abc',
      });
    });

    it('should throw UnauthorizedException if refreshToken is missing', async () => {
      const req = { cookies: {}, headers: {} } as unknown as Request;
      await expect(
        controller.refresh(req, { userId: 'u1' }, mockResponse as unknown as Response),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if userId cannot be resolved', async () => {
      const req = { cookies: { refreshToken: 'token' }, headers: {} } as unknown as Request;
      await expect(
        controller.refresh(req, {}, mockResponse as unknown as Response),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should rethrow HttpException if thrown during refresh', async () => {
      const req = { cookies: { refreshToken: 'bad' }, headers: {} } as unknown as Request;
      const httpErr = new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
      mockUserService.send.mockReturnValue(throwError(() => httpErr));

      await expect(
        controller.refresh(req, { userId: 'u1' }, mockResponse as unknown as Response),
      ).rejects.toThrow(httpErr);
    });

    it('should wrap generic error during refresh', async () => {
      const req = { cookies: { refreshToken: 'bad' }, headers: {} } as unknown as Request;
      mockUserService.send.mockReturnValue(throwError(() => new Error('Redis down')));

      await expect(
        controller.refresh(req, { userId: 'u1' }, mockResponse as unknown as Response),
      ).rejects.toThrow(HttpException);
    });

    it('should handle nullish response gracefully in refresh', async () => {
      const req = {
        cookies: {
          refreshToken: 'cookie-refresh-token',
        },
        headers: {},
      } as unknown as Request;
      const body = { userId: 'u123' };
      mockUserService.send.mockReturnValue(of(null));

      const result = await controller.refresh(req, body, mockResponse as unknown as Response);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });

  it('should not extract token if Bearer is not at the start', async () => {
    const req = {
      cookies: {},
      headers: { authorization: 'Invalid Bearer token123' },
    } as unknown as Request;
    await expect(controller.refresh(req, {}, mockResponse as unknown as Response)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should handle token where Bearer has multiple spaces', async () => {
    const validToken = jwt.sign({ sub: 'user-from-spaces' }, jwtSecret);
    const req = {
      cookies: { refreshToken: 'refresh-abc' },
      headers: { authorization: `Bearer    ${validToken}` },
    } as unknown as Request;
    mockAndValidateAuthContract({ accessToken: 'a2', refreshToken: 'r2' });

    const result = await controller.refresh(req, {}, mockResponse as unknown as Response);
    expect(result.success).toBe(true);
    expect(mockUserService.send).toHaveBeenCalledWith('auth.refresh', {
      userId: 'user-from-spaces',
      refreshToken: 'refresh-abc',
    });
  });

  it('should throw UnauthorizedException if accessToken is invalid and cannot be decoded', async () => {
    const req = {
      cookies: { accessToken: 'invalid-token' },
      headers: {},
    } as unknown as Request;
    try {
      await controller.refresh(req, {}, mockResponse as unknown as Response);
    } catch (err: any) {
      expect(err.message).toBe('Missing refresh token or userId');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error in refresh: Missing refresh token or userId',
        expect.any(String),
      );
    }
  });

  it('should throw UnauthorizedException and log correctly if body.userId and token are missing', async () => {
    const req = {
      cookies: {},
      headers: {},
    } as unknown as Request;
    try {
      await controller.refresh(req, {}, mockResponse as unknown as Response);
    } catch (err: any) {
      expect(err.message).toBe('Missing refresh token or userId');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error in refresh: Missing refresh token or userId',
        expect.any(String),
      );
    }
  });

  it('should handle falsy error in handleError', async () => {
    const req = { cookies: {}, headers: {} } as unknown as Request;
    mockUserService.send.mockReturnValue(throwError(() => null));
    await expect(controller.logout(req, {}, mockResponse as unknown as Response)).rejects.toThrow(
      HttpException,
    );
  });
  describe('logout', () => {
    it('should logout and clear cookies across all paths', async () => {
      const req = {
        cookies: {
          refreshToken: 'cookie-r',
          accessToken: 'cookie-a',
        },
        headers: {},
      } as unknown as Request;
      mockAndValidateAuthContract({ message: 'Logged out successfully' });

      const result = await controller.logout(req, {}, mockResponse as unknown as Response);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');
      expect(result.meta).toBeDefined();
      expect(result.meta.timestamp).toBeDefined();
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'accessToken',
        expect.objectContaining({ path: '/' }),
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({ path: '/api/v1/auth' }),
      );
      expect(loggerSpy).toHaveBeenCalledWith('Handling POST logout');
    });

    it('should extract tokens and userId from body or headers if cookies missing', async () => {
      const validToken = jwt.sign({ sub: 'user-logout' }, jwtSecret);
      const req = {
        cookies: {},
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      } as unknown as Request;
      mockAndValidateAuthContract({ message: 'Logged out successfully' });

      await controller.logout(req, { refreshToken: 'body-r' }, mockResponse as unknown as Response);

      expect(mockUserService.send).toHaveBeenCalledWith('auth.logout', {
        refreshToken: 'body-r',
        accessToken: validToken,
        userId: 'user-logout',
      });
    });

    it('should extract userId with userId field from token during logout', async () => {
      const validToken = jwt.sign({ userId: 'user-logout-2' }, jwtSecret);
      const req = {
        cookies: { accessToken: validToken },
        headers: {},
      } as unknown as Request;
      mockAndValidateAuthContract({ message: 'Logged out' });

      await controller.logout(req, {}, mockResponse as unknown as Response);

      expect(mockUserService.send).toHaveBeenCalledWith('auth.logout', {
        refreshToken: '',
        accessToken: validToken,
        userId: 'user-logout-2',
      });
    });

    it('should handle logout when body provides accessToken and userId directly', async () => {
      const req = { cookies: {}, headers: {} } as unknown as Request;
      mockAndValidateAuthContract({ message: 'Logged out' });

      await controller.logout(
        req,
        { refreshToken: 'r', accessToken: 'a', userId: 'direct-u' },
        mockResponse as unknown as Response,
      );

      expect(mockUserService.send).toHaveBeenCalledWith('auth.logout', {
        refreshToken: 'r',
        accessToken: 'a',
        userId: 'direct-u',
      });
    });

    it('should rethrow HttpException during logout', async () => {
      const req = { cookies: {}, headers: {} } as unknown as Request;
      const httpErr = new HttpException('Logout error', HttpStatus.BAD_REQUEST);
      mockUserService.send.mockReturnValue(throwError(() => httpErr));

      await expect(controller.logout(req, {}, mockResponse as unknown as Response)).rejects.toThrow(
        httpErr,
      );
    });

    it('should wrap generic error during logout', async () => {
      const req = { cookies: {}, headers: {} } as unknown as Request;
      mockUserService.send.mockReturnValue(throwError(() => new Error('Error')));

      await expect(controller.logout(req, {}, mockResponse as unknown as Response)).rejects.toThrow(
        HttpException,
      );
    });
  });

  it('should not extract accessToken if Bearer is not at the start during logout', async () => {
    const req = {
      cookies: { refreshToken: 'cookie-r' },
      headers: { authorization: 'Invalid Bearer token123' },
    } as unknown as Request;
    mockAndValidateAuthContract({ message: 'Logged out successfully' });

    await controller.logout(req, {}, mockResponse as unknown as Response);
    expect(mockUserService.send).toHaveBeenCalledWith('auth.logout', {
      refreshToken: 'cookie-r',
      accessToken: 'Invalid Bearer token123',
      userId: undefined,
    });
  });

  it('should handle token where Bearer has multiple spaces during logout', async () => {
    const req = {
      cookies: { refreshToken: 'cookie-r' },
      headers: { authorization: 'Bearer    token123' },
    } as unknown as Request;
    mockAndValidateAuthContract({ message: 'Logged out successfully' });

    await controller.logout(req, {}, mockResponse as unknown as Response);
    expect(mockUserService.send).toHaveBeenCalledWith('auth.logout', {
      refreshToken: 'cookie-r',
      accessToken: 'token123',
      userId: undefined,
    });
  });

  it('should handle undefined cookies object gracefully during logout', async () => {
    const req = {
      headers: {},
    } as unknown as Request;
    mockAndValidateAuthContract({ message: 'Logged out successfully' });

    await controller.logout(req, { refreshToken: 'body-r' }, mockResponse as unknown as Response);
    expect(mockUserService.send).toHaveBeenCalledWith('auth.logout', {
      refreshToken: 'body-r',
      accessToken: undefined,
      userId: undefined,
    });
  });

  it('should call clearCookie with exact paths', async () => {
    const req = { cookies: {}, headers: {} } as unknown as Request;
    mockAndValidateAuthContract({ message: 'Logged out successfully' });

    await controller.logout(req, {}, mockResponse as unknown as Response);

    expect(mockResponse.clearCookie).toHaveBeenCalledWith(
      'accessToken',
      expect.objectContaining({ path: '/' }),
    );
    expect(mockResponse.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.objectContaining({ path: '/api/v1/auth' }),
    );
    expect(mockResponse.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.objectContaining({ path: '/api/v1/auth/refresh' }),
    );
    expect(mockResponse.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.objectContaining({ path: '/' }),
    );
    expect(loggerSpy).toHaveBeenCalledWith('Handling POST logout');
  });
});
