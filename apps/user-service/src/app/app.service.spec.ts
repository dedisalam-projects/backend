import { Test } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = app.get<AppService>(AppService);
  });

  describe('getHello', () => {
    it('should return default "Hello World from User Service"', () => {
      expect(service.getHello()).toEqual('Hello World from User Service');
    });

    it('should return custom "Hello Dedis from User Service"', () => {
      expect(service.getHello('Dedis')).toEqual('Hello Dedis from User Service');
    });
  });
});
