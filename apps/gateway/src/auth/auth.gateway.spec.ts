import { Test, TestingModule } from '@nestjs/testing';
import { AuthGateway } from './auth.gateway';
import { of } from 'rxjs';

describe('AuthGateway', () => {
  let gateway: AuthGateway;
  let mockUserService: { send: jest.Mock };

  beforeEach(async () => {
    mockUserService = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthGateway, { provide: 'USER_SERVICE', useValue: mockUserService }],
    }).compile();

    gateway = module.get<AuthGateway>(AuthGateway);
  });

  describe('handleLogin', () => {
    it('should forward auth.login to user microservice and return standard envelope', async () => {
      const loginDto = { email: 'user@example.com', password: 'password123' };
      const microserviceResponse = { accessToken: 'jwt-access', refreshToken: 'jwt-refresh' };
      mockUserService.send.mockReturnValueOnce(of(microserviceResponse));

      const result = await gateway.handleLogin(loginDto);

      expect(mockUserService.send).toHaveBeenCalledWith('auth.login', loginDto);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(microserviceResponse);
      expect(result.meta.timestamp).toBeDefined();
    });
  });

  describe('handleRegister', () => {
    it('should forward auth.register to user microservice and return standard envelope', async () => {
      const registerDto = { email: 'new@example.com', password: 'password123', name: 'New User' };
      const microserviceResponse = { message: 'User registered successfully', user: { id: 'u1' } };
      mockUserService.send.mockReturnValueOnce(of(microserviceResponse));

      const result = await gateway.handleRegister(registerDto);

      expect(mockUserService.send).toHaveBeenCalledWith('auth.register', registerDto);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(microserviceResponse);
      expect(result.meta.timestamp).toBeDefined();
    });
  });

  describe('handleRefresh', () => {
    it('should forward auth.refresh to user microservice and return standard envelope', async () => {
      const refreshDto = { userId: 'u1', refreshToken: 'valid-refresh' };
      const microserviceResponse = { accessToken: 'new-access', refreshToken: 'new-refresh' };
      mockUserService.send.mockReturnValueOnce(of(microserviceResponse));

      const result = await gateway.handleRefresh(refreshDto);

      expect(mockUserService.send).toHaveBeenCalledWith('auth.refresh', refreshDto);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(microserviceResponse);
      expect(result.meta.timestamp).toBeDefined();
    });
  });

  describe('handleLogout', () => {
    it('should forward auth.logout to user microservice and return standard envelope', async () => {
      const logoutDto = { refreshToken: 'r1', accessToken: 'a1', userId: 'u1' };
      const microserviceResponse = { message: 'Logged out successfully' };
      mockUserService.send.mockReturnValueOnce(of(microserviceResponse));

      const result = await gateway.handleLogout(logoutDto);

      expect(mockUserService.send).toHaveBeenCalledWith('auth.logout', logoutDto);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(microserviceResponse);
      expect(result.meta.timestamp).toBeDefined();
    });
  });
});
