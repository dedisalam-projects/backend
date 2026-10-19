import 'reflect-metadata';
import { of } from 'rxjs';
import { UnauthorizedException, HttpException, BadRequestException } from '@nestjs/common';
import { getEnvFilePath } from './config/env.helper';
import { createJwtOptions } from './config/jwt.helper';
import {
  resolveCorrelationId,
  resolveCustomProps,
  createPinoLoggerOptions,
} from './config/logger.helper';
import {
  createMicroserviceConfigModule,
  createMicroserviceLoggerModule,
} from './config/module.helper';
import { createRmqClient } from './config/rmq.helper';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { CorrelationIdInterceptor } from './interceptors/correlation-id.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { DocumentQueryDto } from './dto/document-query.dto';

const ctxOf = (req: any, res: any = {}) =>
  ({
    getHandler: () => 'h',
    getClass: () => 'c',
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  }) as any;

describe('config helpers', () => {
  const env = process.env['NODE_ENV'];
  afterEach(() => (process.env['NODE_ENV'] = env));

  it('getEnvFilePath', () => {
    process.env['NODE_ENV'] = 'test';
    expect(getEnvFilePath()).toContain('.env.test');
    process.env['NODE_ENV'] = 'development';
    expect(getEnvFilePath()).toContain('.env.development');
    process.env['NODE_ENV'] = 'production';
    expect(getEnvFilePath()).toBe('.env');
    process.env['NODE_ENV'] = 'other';
    expect(getEnvFilePath()).toBe('.env');
  });

  it('createJwtOptions', () => {
    expect(createJwtOptions({ get: () => undefined } as any).signOptions?.expiresIn).toBe('15m');
    expect(
      createJwtOptions({ get: (k: string) => (k === 'JWT_EXPIRES_IN' ? '1h' : 's') } as any),
    ).toEqual({
      secret: 's',
      signOptions: { expiresIn: '1h' },
    });
  });

  it('logger helpers', () => {
    const req: any = { headers: {} };
    const id = resolveCorrelationId(req);
    expect(req.headers['x-correlation-id']).toBe(id);
    expect(resolveCorrelationId({ headers: { 'x-correlation-id': ['a', 'b'] } } as any)).toBe('a');
    expect(resolveCorrelationId({ headers: { 'x-correlation-id': 'z' } } as any)).toBe('z');
    expect(resolveCustomProps(req, 'svc')).toEqual({ correlationId: id, service: 'svc' });
    const dev: any = createPinoLoggerOptions({ get: () => 'development' } as any, 's');
    expect(dev.pinoHttp.transport).toBeDefined();
    const prod: any = createPinoLoggerOptions({ get: () => 'production' } as any, 's');
    expect(prod.pinoHttp.transport).toBeUndefined();
    expect(prod.pinoHttp.genReqId(req)).toBe(id);
    expect(prod.pinoHttp.customProps(req).service).toBe('s');
  });

  it('module helpers', () => {
    expect(createMicroserviceConfigModule()).toBeDefined();
    expect(createMicroserviceConfigModule((c) => c)).toBeDefined();
    process.env['NODE_ENV'] = 'production';
    expect(createMicroserviceLoggerModule()).toBeDefined();
    process.env['NODE_ENV'] = 'development';
    expect(createMicroserviceLoggerModule('svc')).toBeDefined();
    const lm: any = createMicroserviceLoggerModule('svc');
    void lm;
  });

  it('createRmqClient', () => {
    const c: any = createRmqClient('N', 'q', { x: 1 });
    expect(c.name).toBe('N');
    expect(c.useFactory({ get: () => 'amqp://x' }).options.urls).toEqual(['amqp://x']);
    expect(() => c.useFactory({ get: () => undefined })).toThrow(
      'RabbitMQ URL is not configured. Set RABBITMQ_URL.',
    );
    expect(createRmqClient('N', 'q').useFactory!({ get: () => 'u' } as any)).toBeDefined();
  });
});

describe('guards', () => {
  it('JwtAuthGuard', () => {
    const reflector: any = { getAllAndOverride: jest.fn().mockReturnValue(true) };
    const g = new JwtAuthGuard(reflector);
    expect(g.canActivate(ctxOf({}))).toBe(true);
    reflector.getAllAndOverride.mockReturnValue(false);
    const sup = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue('sup');
    expect(g.canActivate(ctxOf({}))).toBe('sup');
    sup.mockRestore();
    expect(g.handleRequest(null, { id: 1 })).toEqual({ id: 1 });
    expect(() => g.handleRequest(null, null)).toThrow(UnauthorizedException);
    const err = new Error('e');
    expect(() => g.handleRequest(err, null)).toThrow(err);
  });

  it('RolesGuard', () => {
    const reflector: any = { getAllAndOverride: jest.fn() };
    const g = new RolesGuard(reflector);
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(g.canActivate(ctxOf({}))).toBe(true);
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    expect(g.canActivate(ctxOf({}))).toBe(false);
    expect(g.canActivate(ctxOf({ user: { roles: ['admin'] } }))).toBe(true);
    expect(g.canActivate(ctxOf({ user: { roles: 'admin' } }))).toBe(true);
    expect(g.canActivate(ctxOf({ user: { role: 'admin' } }))).toBe(true);
    expect(g.canActivate(ctxOf({ user: { role: 'user' } }))).toBe(false);
    expect(g.canActivate(ctxOf({ user: {} }))).toBe(false);
  });
});

describe('interceptors', () => {
  it('CorrelationIdInterceptor', () => {
    const i = new CorrelationIdInterceptor();
    const res = { setHeader: jest.fn() };
    const next: any = { handle: jest.fn().mockReturnValue('n') };
    expect(i.intercept(ctxOf({ headers: { 'x-correlation-id': 'c' } }, res), next)).toBe('n');
    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'c');
    i.intercept(ctxOf({ headers: {}, id: 'r' }, res), next);
    i.intercept(ctxOf({ headers: {} }, res), next);
    expect(res.setHeader).toHaveBeenLastCalledWith('X-Correlation-ID', 'unknown');
  });

  it('TransformInterceptor', async () => {
    const t = new TransformInterceptor<any>();
    const run = async (data: any, res: any = { statusCode: 201 }) => {
      let out: any;
      t.intercept(ctxOf({}, res), { handle: () => of(data) } as any).subscribe((v) => (out = v));
      return out;
    };
    expect((await run({ statusCode: 1, meta: { timestamp: 't' } })).meta.timestamp).toBe('t');
    expect((await run('plain')).data).toBe('plain');
    expect((await run(null, null)).statusCode).toBe(200);
    expect((await run({ message: 'm', data: [1] })).data).toEqual([1]);
    expect((await run({ message: 'm', a: 1, b: 2 })).data).toEqual({ a: 1, b: 2 });
    expect((await run({ message: 'm' })).data).toBeNull();
    expect((await run({ message: 'm', data: 1, x: 1 })).data).toEqual({ data: 1, x: 1 });
  });
});

describe('HttpExceptionFilter', () => {
  const make = (req: any = { method: 'GET', url: '/', headers: {} }) => {
    const json = jest.fn();
    const res: any = { status: jest.fn(() => ({ json })) };
    const host: any = { switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }) };
    return { json, res, host };
  };
  const f = new HttpExceptionFilter();

  it('handles variants', () => {
    let m = make();
    f.catch(new HttpException('str', 400), m.host);
    expect(m.json.mock.calls[0][0].message).toBe('str');
    m = make({ method: 'GET', url: '/', headers: { 'x-correlation-id': 'c' } });
    f.catch(new BadRequestException(['a', { field: 'x' }]), m.host);
    expect(m.json.mock.calls[0][0].message).toBe('Validation failed');
    expect(m.json.mock.calls[0][0].details).toHaveLength(2);
    m = make({ method: 'GET', url: '/', headers: {}, id: 'i' });
    f.catch(new HttpException({ message: 'obj', error: 'E' }, 409), m.host);
    f.catch(new HttpException({}, 409), m.host);
    f.catch(new Error('boom'), m.host);
    f.catch({ weird: true }, m.host);
    f.catch(new HttpException('x', 500), m.host);
    expect(m.res.status).toHaveBeenCalled();
  });
});

describe('DocumentQueryDto', () => {
  it('has defaults', () => {
    const d = new DocumentQueryDto();
    expect(d.page).toBe(1);
    expect(d.limit).toBe(10);
  });
});
