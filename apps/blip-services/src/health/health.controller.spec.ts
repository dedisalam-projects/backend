import { HealthController } from './health.controller';

describe('HealthController (blip-services)', () => {
  it('should run the mongodb ping check through HealthCheckService', async () => {
    const db = { pingCheck: jest.fn().mockResolvedValue({ mongodb: { status: 'up' } }) };
    const health = {
      check: jest.fn(async (fns: Array<() => unknown>) => ({
        status: 'ok',
        info: Object.assign({}, ...(await Promise.all(fns.map((f) => f())))),
      })),
    };
    const controller = new HealthController(health as any, db as any);

    const res = await controller.check();

    expect(db.pingCheck).toHaveBeenCalledWith('mongodb');
    expect(res).toEqual({ status: 'ok', info: { mongodb: { status: 'up' } } });
  });
});
