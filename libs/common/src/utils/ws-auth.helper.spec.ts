import * as jwt from 'jsonwebtoken';
import { HttpException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { RpcExceptionFilter } from '../filters/rpc-exception.filter';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import {
  extractSocketToken,
  createWsJwtAuthMiddleware,
  authenticateSocketConnection,
  assertSocketAdmin,
} from './ws-auth.helper';

const S = 'secret';
const sock = (h: any = {}): any => ({
  id: 'c1',
  handshake: h,
  data: undefined,
  emit: jest.fn(),
  disconnect: jest.fn(),
});
const tok = jwt.sign({ email: 'e', role: 'user' }, S);

describe('extractSocketToken', () => {
  it('all sources', () => {
    expect(extractSocketToken(sock({ auth: { token: 'Bearer a' } }))).toBe('a');
    expect(extractSocketToken(sock({ auth: { token: 'a' } }))).toBe('a');
    expect(extractSocketToken(sock({ headers: { authorization: 'Bearer b' } }))).toBe('b');
    expect(extractSocketToken(sock({ headers: { authorization: 'b' } }))).toBe('b');
    expect(extractSocketToken(sock({ query: { token: 'q' } }))).toBe('q');
    expect(extractSocketToken(sock({ headers: { cookie: 'accessToken=ck' } }))).toBe('ck');
    expect(extractSocketToken(sock({ headers: { cookie: 'x=1' } }))).toBeNull();
    expect(extractSocketToken(sock({}))).toBeNull();
    expect(extractSocketToken({} as any)).toBeNull();
  });
});

describe('createWsJwtAuthMiddleware', () => {
  const run = (secret: any, client: any, logger?: any) => {
    const next = jest.fn();
    createWsJwtAuthMiddleware(secret, logger)(client, next);
    return next;
  };
  it('rejects missing token', () => {
    expect(run(S, sock({}))).toHaveBeenCalledWith(expect.any(Error));
  });
  it('accepts via string, fn, config', () => {
    for (const s of [S, () => S, { get: () => S }]) {
      const c = sock({ auth: { token: tok } });
      const n = run(s, c);
      expect(n).toHaveBeenCalledWith();
      expect(c.data.user.email).toBe('e');
    }
    const c = sock({ auth: { token: tok } });
    c.data = {};
    run(S, c);
  });
  it('rejects missing secret / invalid token', () => {
    const logger = { error: jest.fn() };
    expect(run('', sock({ auth: { token: tok } }), logger)).toHaveBeenCalledWith(expect.any(Error));
    expect(run(() => '', sock({ auth: { token: tok } }))).toHaveBeenCalledWith(expect.any(Error));
    expect(run({ get: () => undefined }, sock({ auth: { token: tok } }))).toHaveBeenCalledWith(
      expect.any(Error),
    );
    expect(run(undefined, sock({ auth: { token: tok } }))).toHaveBeenCalledWith(expect.any(Error));
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('authenticateSocketConnection', () => {
  const logger = { log: jest.fn(), warn: jest.fn() };
  it('already authenticated', () => {
    const c = sock();
    c.data = { user: { email: 'u' } };
    expect(authenticateSocketConnection(c, S, logger, 'ns')).toEqual({ email: 'u' });
    expect(authenticateSocketConnection(c, S, logger, '')).toEqual({ email: 'u' });
    expect(authenticateSocketConnection(c, S)).toEqual({ email: 'u' });
  });
  it('missing token', () => {
    const c = sock({});
    expect(authenticateSocketConnection(c, S, logger)).toBeNull();
    expect(c.disconnect).toHaveBeenCalled();
    expect(authenticateSocketConnection(sock({}), S)).toBeNull();
  });
  it('valid / invalid token', () => {
    const c = sock({ auth: { token: tok } });
    expect(authenticateSocketConnection(c, S, logger, 'ns')?.['email']).toBe('e');
    c.data = undefined;
    expect(authenticateSocketConnection(c, S, logger, '')?.['email']).toBe('e');
    c.data = undefined;
    expect(authenticateSocketConnection(sock({ auth: { token: tok } }), S)).toBeTruthy();
    expect(authenticateSocketConnection(sock({ auth: { token: 'bad' } }), S, logger)).toBeNull();
    expect(authenticateSocketConnection(sock({ auth: { token: 'bad' } }), S)).toBeNull();
    const pre: any = sock({ auth: { token: tok } });
    pre.data = {};
    authenticateSocketConnection(pre, S);
  });
});

describe('assertSocketAdmin', () => {
  const withUser = (u: any) => {
    const c = sock();
    c.data = { user: u };
    return c;
  };
  it('cases', () => {
    expect(() => assertSocketAdmin(sock())).toThrow();
    expect(() => assertSocketAdmin(withUser({ roles: ['admin'] }))).not.toThrow();
    expect(() => assertSocketAdmin(withUser({ roles: 'super_admin' }))).not.toThrow();
    expect(() => assertSocketAdmin(withUser({ role: 'admin' }))).not.toThrow();
    expect(() => assertSocketAdmin(withUser({ role: 'user' }))).toThrow();
    expect(() => assertSocketAdmin(withUser({}))).toThrow();
  });
});

describe('filter leftovers', () => {
  it('rpc: null response', async () => {
    const e = new HttpException('x', 400);
    jest.spyOn(e, 'getResponse').mockReturnValue(null as any);
    await expect(firstValueFrom(new RpcExceptionFilter().catch(e))).rejects.toMatchObject({
      message: 'x',
    });
  });
  it('http: details array', () => {
    const json = jest.fn();
    const host: any = {
      switchToHttp: () => ({
        getResponse: () => ({ status: () => ({ json }) }),
        getRequest: () => ({ method: 'G', url: '/', headers: {} }),
      }),
    };
    new HttpExceptionFilter().catch(new HttpException({ message: 'm', details: [1] }, 400), host);
    expect(json.mock.calls[0][0].details).toEqual([1]);
    const odd = new HttpException('x', 400);
    jest.spyOn(odd, 'getResponse').mockReturnValue(42 as any);
    new HttpExceptionFilter().catch(odd, host);
    expect(json).toHaveBeenCalledTimes(2);
  });
  it('ws-auth: logger without methods', () => {
    const c: any = { id: 'c', handshake: { auth: { token: tok } }, data: { user: { email: 'u' } } };
    expect(authenticateSocketConnection(c, S, {} as any)).toBeTruthy();
    c.data = undefined;
    expect(authenticateSocketConnection(c, S, {} as any)).toBeTruthy();
    const bad: any = {
      id: 'c',
      handshake: { auth: { token: 'bad' } },
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
    expect(authenticateSocketConnection(bad, S, {} as any)).toBeNull();
    const none: any = { id: 'c', handshake: {}, emit: jest.fn(), disconnect: jest.fn() };
    expect(authenticateSocketConnection(none, S, {} as any)).toBeNull();
  });
});
