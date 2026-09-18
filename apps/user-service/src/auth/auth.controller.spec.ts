import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: {
    login: jest.Mock;
    register: jest.Mock;
    refresh: jest.Mock;
    getProfile: jest.Mock;
    getAllUsers: jest.Mock;
    logout: jest.Mock;
    updateProfile: jest.Mock;
    createUser: jest.Mock;
    getUsersPaginated: jest.Mock;
    updateUserByAdmin: jest.Mock;
    deleteUser: jest.Mock;
    deleteUsers: jest.Mock;
  };

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn(),
      register: jest.fn(),
      refresh: jest.fn(),
      getProfile: jest.fn(),
      getAllUsers: jest.fn(),
      logout: jest.fn(),
      updateProfile: jest.fn(),
      createUser: jest.fn(),
      getUsersPaginated: jest.fn(),
      updateUserByAdmin: jest.fn(),
      deleteUser: jest.fn(),
      deleteUsers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should delegate login to authService.login', async () => {
    const dto = { email: 'a@b.com', password: '123' };
    mockAuthService.login.mockResolvedValueOnce({ accessToken: 'tok' });

    const result = await controller.login(dto);
    expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ accessToken: 'tok' });
  });

  it('should delegate register to authService.register', async () => {
    const dto = { email: 'a@b.com', password: '123', name: 'A' };
    mockAuthService.register.mockResolvedValueOnce({ message: 'ok' });

    const result = await controller.register(dto);
    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ message: 'ok' });
  });

  it('should delegate refresh to authService.refresh', async () => {
    const dto = { userId: 'u1', refreshToken: 'r1' };
    mockAuthService.refresh.mockResolvedValueOnce({ accessToken: 'tok2' });

    const result = await controller.refresh(dto);
    expect(mockAuthService.refresh).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ accessToken: 'tok2' });
  });

  it('should delegate getProfile to authService.getProfile', async () => {
    mockAuthService.getProfile.mockResolvedValueOnce({ id: 'u1' });

    const result = await controller.getProfile({ userId: 'u1' });
    expect(mockAuthService.getProfile).toHaveBeenCalledWith('u1');
    expect(result).toEqual({ id: 'u1' });
  });

  it('should delegate getAllUsers to authService.getAllUsers', async () => {
    mockAuthService.getAllUsers.mockResolvedValueOnce([{ id: 'u1' }]);

    const result = await controller.getAllUsers();
    expect(mockAuthService.getAllUsers).toHaveBeenCalled();
    expect(result).toEqual([{ id: 'u1' }]);
  });

  it('should delegate logout to authService.logout', async () => {
    const dto = { refreshToken: 'r1', accessToken: 'a1', userId: 'u1' };
    mockAuthService.logout.mockResolvedValueOnce({ message: 'logged out' });

    const result = await controller.logout(dto);
    expect(mockAuthService.logout).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ message: 'logged out' });
  });

  it('should delegate updateProfile to authService.updateProfile', async () => {
    const data = { userId: 'u1', name: 'New' };
    mockAuthService.updateProfile.mockResolvedValueOnce({ id: 'u1', name: 'New' });

    const result = await controller.updateProfile(data);
    expect(mockAuthService.updateProfile).toHaveBeenCalledWith(data);
    expect(result).toEqual({ id: 'u1', name: 'New' });
  });

  it('should delegate createUser to authService.createUser', async () => {
    const data = { email: 'admin@b.com', password: 'p', name: 'Admin', role: 'admin' };
    mockAuthService.createUser.mockResolvedValueOnce({ id: 'u2' });

    const result = await controller.createUser(data);
    expect(mockAuthService.createUser).toHaveBeenCalledWith(data);
    expect(result).toEqual({ id: 'u2' });
  });

  it('should delegate getUsersPaginated to authService.getUsersPaginated', async () => {
    const query = { page: 1, limit: 10 };
    mockAuthService.getUsersPaginated.mockResolvedValueOnce({ items: [], meta: {} });

    const result = await controller.getUsersPaginated(query);
    expect(mockAuthService.getUsersPaginated).toHaveBeenCalledWith(query);
    expect(result).toEqual({ items: [], meta: {} });
  });

  it('should delegate updateUserByAdmin to authService.updateUserByAdmin separating userId', async () => {
    const data = { userId: 'u1', name: 'Admin Updated', role: 'admin' };
    mockAuthService.updateUserByAdmin.mockResolvedValueOnce({ id: 'u1' });

    const result = await controller.updateUserByAdmin(data);
    expect(mockAuthService.updateUserByAdmin).toHaveBeenCalledWith('u1', {
      name: 'Admin Updated',
      role: 'admin',
    });
    expect(result).toEqual({ id: 'u1' });
  });

  it('should delegate deleteUser to authService.deleteUser', async () => {
    mockAuthService.deleteUser.mockResolvedValueOnce({ userId: 'u1' });

    const result = await controller.deleteUser({ userId: 'u1' });
    expect(mockAuthService.deleteUser).toHaveBeenCalledWith('u1');
    expect(result).toEqual({ userId: 'u1' });
  });
  it('should delegate deleteUsers to authService.deleteUsers', async () => {
    mockAuthService.deleteUsers.mockResolvedValueOnce({ userIds: ['u1', 'u2'] });

    const result = await controller.deleteUsers({ userIds: ['u1', 'u2'] });
    expect(mockAuthService.deleteUsers).toHaveBeenCalledWith(['u1', 'u2']);
    expect(result).toEqual({ userIds: ['u1', 'u2'] });
  });
});
