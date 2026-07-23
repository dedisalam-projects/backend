import { Test } from '@nestjs/testing';
import { AppService } from './app.service';
import { of } from 'rxjs';

describe('AppService', () => {
  let service: AppService;
  let mockUserClient: any;

  beforeAll(async () => {
    mockUserClient = {
      send: jest.fn().mockReturnValue(of({ message: 'Mock response', correlationId: '123' })),
      emit: jest.fn().mockReturnValue(of({})),
    };

    const app = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: 'USER_SERVICE',
          useValue: mockUserClient,
        },
      ],
    }).compile();

    service = app.get<AppService>(AppService);
  });

  describe('getHello', () => {
    it('should return hello message with user service ok status', async () => {
      const response = await service.getHello();
      expect(response).toEqual({
        message: 'Hello World',
        services: {
          user: 'ok',
        },
      });
      expect(mockUserClient.send).toHaveBeenCalledWith('user.hello', {
        message: 'Hello from API Gateway',
        correlationId: 'gateway-hello-id',
      });
    });

    it('should handle errors by returning user service error status', async () => {
      mockUserClient.send.mockImplementationOnce(() => {
        throw new Error('TCP Connection Failed');
      });
      const response = await service.getHello();
      expect(response).toEqual({
        message: 'Hello World',
        services: {
          user: 'error',
        },
      });
    });
  });
});
