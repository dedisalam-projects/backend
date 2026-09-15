import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { UserController } from './user.controller';
import { UserPaginationQueryDto, UserRole } from '@dedisalam/common';

describe('UserController', () => {
  let controller: UserController;
  let mockUserService: { send: jest.Mock };

  beforeEach(async () => {
    mockUserService = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: 'USER_SERVICE', useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return paginated users successfully', async () => {
      const query: UserPaginationQueryDto = {
        page: 1,
        limit: 10,
        search: 'john',
        role: UserRole.USER,
      };

      const mockResponse = {
        items: [
          { id: '1', name: 'John Doe', email: 'john@example.com', role: 'user', isActive: true },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockUserService.send.mockReturnValue(of(mockResponse));

      const result = await controller.getUsers(query);

      expect(mockUserService.send).toHaveBeenCalledWith('user.list.paginated', query);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(result.meta).toBeDefined();
      expect(result.meta.timestamp).toBeDefined();
    });

    it('should pass empty query object if query is undefined', async () => {
      const mockResponse = {
        items: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };

      mockUserService.send.mockReturnValue(of(mockResponse));

      const result = await controller.getUsers(undefined as any);

      expect(mockUserService.send).toHaveBeenCalledWith('user.list.paginated', {});
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });

    it('should rethrow HttpException if error is already an HttpException', async () => {
      const httpError = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      mockUserService.send.mockReturnValue(throwError(() => httpError));

      await expect(controller.getUsers({ page: 1, limit: 10 })).rejects.toThrow(httpError);
    });

    it('should throw internal server error HttpException if generic error occurs', async () => {
      mockUserService.send.mockReturnValue(throwError(() => new Error('Connection timeout')));

      await expect(controller.getUsers({ page: 1, limit: 10 })).rejects.toThrow(
        new HttpException('Connection timeout', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });

    it('should fallback to Internal Server Error and use error status when message is missing', async () => {
      mockUserService.send.mockReturnValue(throwError(() => ({ status: HttpStatus.BAD_GATEWAY })));

      await expect(controller.getUsers({ page: 1, limit: 10 })).rejects.toThrow(
        new HttpException('Internal Server Error', HttpStatus.BAD_GATEWAY),
      );
    });
  });
});
