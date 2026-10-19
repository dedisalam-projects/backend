import { AppService } from './app.service';

describe('AppService (blip-services)', () => {
  it('should return greeting message', () => {
    expect(new AppService().getData()).toEqual({
      message: 'Hello from Blip Services (Document Processing Service)',
    });
  });
});
