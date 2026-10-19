import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getData: jest.fn().mockReturnValue({ message: 'Hello from Auth Service' }),
          },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return getData', () => {
    expect(controller.getData()).toEqual({ message: 'Hello from Auth Service' });
    expect(service.getData).toHaveBeenCalled();
  });

  it('should return ping response', () => {
    const res = controller.ping();
    expect(res.status).toBe('ok');
    expect(res.timestamp).toBeDefined();
  });
});
