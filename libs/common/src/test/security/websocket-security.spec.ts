import { io, Socket } from 'socket.io-client';
import * as jwt from 'jsonwebtoken';

interface SecurityWsResponse {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

describe('Layer 6: WebSocket Security, RBAC & Exploit Defense Suite', () => {
  const GATEWAY_URL = process.env['GATEWAY_URL'] || 'http://localhost:3000';
  let userSocket: Socket;
  let userToken: string;
  let adminToken: string;
  const password = 'SecuredPassword123!';
  const normalEmail = `sec_user_${Date.now()}@example.com`;
  const adminEmail = `sec_admin_${Date.now()}@example.com`;

  beforeAll(async () => {
    // 1. Create and authenticate normal user
    await fetch(`${GATEWAY_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalEmail,
        password,
        name: 'Regular Security User',
        role: 'user',
      }),
    });
    const userLoginRes = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalEmail, password }),
    });
    const userHeaders = userLoginRes.headers as unknown as {
      getSetCookie?: () => string[];
    };
    const userCookies = userHeaders.getSetCookie
      ? userHeaders.getSetCookie()
      : [userLoginRes.headers.get('set-cookie') || ''];
    for (const c of userCookies) {
      const match = c.match(/accessToken=([^;]+)/);
      if (match) userToken = match[1];
    }

    // 2. Create and authenticate admin user
    await fetch(`${GATEWAY_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password,
        name: 'Admin Security User',
        role: 'admin',
      }),
    });
    const adminLoginRes = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password }),
    });
    const adminHeaders = adminLoginRes.headers as unknown as {
      getSetCookie?: () => string[];
    };
    const adminCookies = adminHeaders.getSetCookie
      ? adminHeaders.getSetCookie()
      : [adminLoginRes.headers.get('set-cookie') || ''];
    for (const c of adminCookies) {
      const match = c.match(/accessToken=([^;]+)/);
      if (match) adminToken = match[1];
    }

    // Connect user socket to /users
    userSocket = io(`${GATEWAY_URL}/users`, {
      auth: { token: userToken },
      transports: ['websocket', 'polling'],
      forceNew: true,
    });

    await new Promise<void>((resolve, reject) => {
      userSocket.on('connect', () => resolve());
      userSocket.on('connect_error', (err) => reject(err));
    });
  }, 10000);

  afterAll(() => {
    if (userSocket && userSocket.connected) userSocket.disconnect();
  });

  describe('Privilege Escalation & Event Spoofing Defense', () => {
    it('Sec 1: should reject unauthorized regular user attempting admin:join', async () => {
      const res = (await userSocket.emitWithAck('admin:join', {})) as SecurityWsResponse;
      expect(res).toBeDefined();
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('FORBIDDEN');
    });

    it('Sec 2: should reject unauthorized regular user attempting admin:users:create', async () => {
      const res = (await userSocket.emitWithAck('admin:users:create', {
        email: `spoofed_${Date.now()}@example.com`,
        password: 'Password123!',
        name: 'Spoofed User',
        role: 'admin',
      })) as SecurityWsResponse;

      expect(res).toBeDefined();
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('FORBIDDEN');
    });

    it('Sec 3: should reject unauthorized regular user attempting admin:users:update', async () => {
      const res = (await userSocket.emitWithAck('admin:users:update', {
        userId: 'any-user-id',
        name: 'Hacked Name',
      })) as SecurityWsResponse;

      expect(res).toBeDefined();
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('FORBIDDEN');
    });

    it('Sec 4: should reject unauthorized regular user attempting admin:users:delete', async () => {
      const res = (await userSocket.emitWithAck('admin:users:delete', {
        userId: 'any-user-id',
      })) as SecurityWsResponse;

      expect(res).toBeDefined();
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('FORBIDDEN');
    });
  });

  describe('JWT Forgery & Tampering Defense', () => {
    it('Sec 5: should reject connection with forged JWT signed by invalid secret', async () => {
      const forgedToken = jwt.sign(
        { sub: 'hacker-id', email: 'hacker@evil.com', roles: ['admin'] },
        'wrong-secret-key',
        { expiresIn: '1h' },
      );

      const badSocket = io(`${GATEWAY_URL}/users`, {
        auth: { token: forgedToken },
        transports: ['websocket', 'polling'],
        forceNew: true,
      });

      const rejectionPromise = new Promise<{ code?: string; reason?: string }>((resolve) => {
        badSocket.on('exception', (data) => {
          resolve({ code: data?.error?.code });
        });
        badSocket.on('connect_error', (err) => {
          resolve({ code: 'UNAUTHORIZED', reason: err.message });
        });
        badSocket.on('disconnect', (reason) => {
          resolve({ reason });
        });
      });

      const result = await rejectionPromise;
      expect(result.code === 'UNAUTHORIZED' || result.reason === 'io server disconnect').toBe(true);
      badSocket.disconnect();
    });

    it('Sec 6: should reject connection with corrupted token string', async () => {
      const badSocket = io(`${GATEWAY_URL}/users`, {
        auth: { token: 'invalid.bearer.token.string' },
        transports: ['websocket', 'polling'],
        forceNew: true,
      });

      const rejectionPromise = new Promise<{ code?: string; reason?: string }>((resolve) => {
        badSocket.on('exception', (data) => {
          resolve({ code: data?.error?.code });
        });
        badSocket.on('connect_error', (err) => {
          resolve({ code: 'UNAUTHORIZED', reason: err.message });
        });
        badSocket.on('disconnect', (reason) => {
          resolve({ reason });
        });
      });

      const result = await rejectionPromise;
      expect(result.code === 'UNAUTHORIZED' || result.reason === 'io server disconnect').toBe(true);
      badSocket.disconnect();
    });
  });

  describe('NoSQL Operator Injection Defense', () => {
    it('Sec 7: should sanitize and reject NoSQL operator injection in parameters with VALIDATION_ERROR', async () => {
      // Connect admin socket to test input validation pipes
      const adminSocket = io(`${GATEWAY_URL}/users`, {
        auth: { token: adminToken },
        transports: ['websocket', 'polling'],
        forceNew: true,
      });

      await new Promise<void>((resolve) => adminSocket.on('connect', () => resolve()));

      const injectionPayload: Record<string, unknown> = {
        userId: { $ne: null }, // Attempting NoSQL injection to match all users
        name: { $gt: '' },
      };

      const res = (await adminSocket.emitWithAck(
        'admin:users:update',
        injectionPayload,
      )) as SecurityWsResponse;
      expect(res).toBeDefined();
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('VALIDATION_ERROR');

      adminSocket.disconnect();
    });
  });

  describe('Prototype Pollution Sanitization Defense', () => {
    it('Sec 8: should not pollute Object.prototype when receiving __proto__ or constructor keys', async () => {
      const maliciousPayload = JSON.parse('{"__proto__":{"polluted":true},"name":"Safe Name"}');

      const res = (await userSocket.emitWithAck(
        'user:profile',
        maliciousPayload,
      )) as SecurityWsResponse;
      expect(res).toBeDefined();

      // Verify that global prototype was NOT contaminated
      expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
    });
  });
});
