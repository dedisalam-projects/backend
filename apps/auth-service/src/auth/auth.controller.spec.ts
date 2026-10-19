import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    login: jest.Mock;
    register: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
  };

  const mockLoginDto = { email: 'test@example.com', password: 'Password123!' };
  const mockRegisterDto = { email: 'test@example.com', password: 'Password123!', name: 'Test' };
  const mockRefreshDto = { refreshToken: 'valid-refresh-token', userId: 'user-123' };

  beforeEach(async () => {
    authService = {
      login: jest.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' }),
      register: jest.fn().mockResolvedValue({ id: 'user-123', email: 'test@example.com' }),
      refresh: jest
        .fn()
        .mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
      logout: jest.fn().mockResolvedValue({ message: 'Logged out successfully' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Microservice Message Patterns', () => {
    it('handleLogin should delegate to authService.login', async () => {
      const res = await controller.handleLogin(mockLoginDto);
      expect(authService.login).toHaveBeenCalledWith(mockLoginDto);
      expect(res).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
    });

    it('handleRegister should delegate to authService.register', async () => {
      const res = await controller.handleRegister(mockRegisterDto);
      expect(authService.register).toHaveBeenCalledWith(mockRegisterDto);
      expect(res).toEqual({ id: 'user-123', email: 'test@example.com' });
    });

    it('handleRefresh should delegate to authService.refresh', async () => {
      const res = await controller.handleRefresh(mockRefreshDto);
      expect(authService.refresh).toHaveBeenCalledWith(mockRefreshDto);
      expect(res).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    });

    it('handleLogout should delegate to authService.logout', async () => {
      const res = await controller.handleLogout({ userId: 'user-123' });
      expect(authService.logout).toHaveBeenCalledWith('user-123');
      expect(res).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('HTTP Endpoints', () => {
    it('httpLogin should delegate to authService.login', async () => {
      const res = await controller.httpLogin(mockLoginDto);
      expect(authService.login).toHaveBeenCalledWith(mockLoginDto);
      expect(res).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
    });

    it('httpRegister should delegate to authService.register', async () => {
      const res = await controller.httpRegister(mockRegisterDto);
      expect(authService.register).toHaveBeenCalledWith(mockRegisterDto);
      expect(res).toEqual({ id: 'user-123', email: 'test@example.com' });
    });

    it('httpRefresh should delegate to authService.refresh', async () => {
      const res = await controller.httpRefresh(mockRefreshDto);
      expect(authService.refresh).toHaveBeenCalledWith(mockRefreshDto);
      expect(res).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    });

    it('httpLogout should delegate to authService.logout', async () => {
      const res = await controller.httpLogout({ userId: 'user-123' });
      expect(authService.logout).toHaveBeenCalledWith('user-123');
      expect(res).toEqual({ message: 'Logged out successfully' });
    });
  });
});
