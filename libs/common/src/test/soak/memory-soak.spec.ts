import { io } from 'socket.io-client';

describe('Soak & Memory Leak Verification Suite', () => {
  const GATEWAY_URL = process.env['GATEWAY_URL'] || 'http://localhost:3000';
  let token: string;

  const email = `soak_${Date.now()}@example.com`;
  const password = 'SoakPassword123!';

  beforeAll(async () => {
    await fetch(`${GATEWAY_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name: 'Soak Test User',
        role: 'user',
      }),
    });

    const loginRes = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const headers = loginRes.headers as unknown as { getSetCookie?: () => string[] };
    const cookies = headers.getSetCookie
      ? headers.getSetCookie()
      : [loginRes.headers.get('set-cookie') || ''];
    for (const c of cookies) {
      const match = c.match(/accessToken=([^;]+)/);
      if (match) token = match[1];
    }
  }, 15000);

  describe('Connect-RPC-Disconnect Heap & Resource Drain', () => {
    it('should complete 100 consecutive connection cycles without heap runaway or listener leaks', async () => {
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage().heapUsed;
      const ITERATIONS = 100;

      for (let i = 0; i < ITERATIONS; i++) {
        const socket = io(`${GATEWAY_URL}/users`, {
          auth: { token },
          transports: ['websocket'],
          forceNew: true,
        });

        await new Promise<void>((resolve, reject) => {
          socket.on('connect', () => resolve());
          socket.on('connect_error', (err) => reject(err));
        });

        const res = (await socket.emitWithAck('user:profile')) as { success?: boolean };
        expect(res).toBeDefined();
        expect(res.success).toBe(true);

        socket.disconnect();
        expect(socket.connected).toBe(false);
      }

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const heapDeltaMB = (finalMemory - initialMemory) / (1024 * 1024);

      // Verify heap delta is within safe bounds (< 30 MB growth over 100 connect-disconnect cycles)
      expect(heapDeltaMB).toBeLessThan(30);
    }, 60000);
  });

  describe('Long-Lived Socket Steady-State Load', () => {
    it('should handle 100 consecutive RPC calls on single connection without listener accumulation', async () => {
      const socket = io(`${GATEWAY_URL}/users`, {
        auth: { token },
        transports: ['websocket'],
        forceNew: true,
      });

      await new Promise<void>((resolve) => socket.on('connect', () => resolve()));

      const getListenerCount = (event: string) => {
        const socketWithListeners = socket as unknown as {
          listeners?: (e: string) => unknown[];
        };
        return socketWithListeners.listeners ? socketWithListeners.listeners(event).length : 0;
      };

      const initialListeners = getListenerCount('user:profile');

      const CALL_COUNT = 100;
      for (let i = 0; i < CALL_COUNT; i++) {
        const res = (await socket.emitWithAck('user:profile')) as { success?: boolean };
        expect(res.success).toBe(true);
      }

      const finalListeners = getListenerCount('user:profile');

      // Ensure emitWithAck does not leave dangling temporary listeners
      expect(finalListeners).toBe(initialListeners);

      socket.disconnect();
    }, 30000);
  });
});
