import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController (blip-services)', () => {
  const appService = { getData: jest.fn().mockReturnValue({ message: 'hi' }) };
  const controller = new AppController(appService as unknown as AppService);

  it('should delegate getData to AppService', () => {
    expect(controller.getData()).toEqual({ message: 'hi' });
    expect(appService.getData).toHaveBeenCalled();
  });

  it('should answer blip.ping', () => {
    const res = controller.ping();
    expect(res.status).toBe('ok');
    expect(new Date(res.timestamp).toString()).not.toBe('Invalid Date');
  });
});
