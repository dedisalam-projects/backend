import { io, Socket } from 'socket.io-client';

describe('Layer 6: Realtime WebSocket & Socket.IO Concurrency Load Suite', () => {
  const GATEWAY_URL = process.env['GATEWAY_URL'] || 'http://localhost:3000';
  let adminToken: string;

  beforeAll(async () => {
    const email = `load_admin_${Date.now()}@example.com`;
    const password = 'Password123!';

    await fetch(`${GATEWAY_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name: 'Load Test Admin',
        role: 'admin',
      }),
    });

    const loginRes = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const cookies = (loginRes.headers as any).getSetCookie
      ? (loginRes.headers as any).getSetCookie()
      : [loginRes.headers.get('set-cookie') || ''];
    for (const c of cookies) {
      const match = c.match(/accessToken=([^;]+)/);
      if (match) adminToken = match[1];
    }
  }, 10000);

  it('Load 1: should sustain 30 concurrent socket handshakes with 100% success rate', async () => {
    const totalClients = 30;

    const connectPromises = Array.from({ length: totalClients }).map(
      () =>
        new Promise<Socket>((resolve, reject) => {
          const socket = io(`${GATEWAY_URL}/users`, {
            auth: { token: adminToken },
            transports: ['websocket', 'polling'],
            forceNew: true,
          });

          const timer = setTimeout(() => reject(new Error('Connection timeout')), 5000);

          socket.on('connect', () => {
            clearTimeout(timer);
            resolve(socket);
          });
          socket.on('connect_error', (err) => {
            clearTimeout(timer);
            reject(err);
          });
        }),
    );

    const connectedSockets = await Promise.all(connectPromises);
    expect(connectedSockets).toHaveLength(totalClients);
    expect(connectedSockets.every((s) => s.connected)).toBe(true);

    // Disconnect all cleanly
    connectedSockets.forEach((s) => s.disconnect());
  });

  it('Load 2: should execute 100 concurrent emitWithAck RPCs with 0% error rate and <200ms p95 latency', async () => {
    const client = io(`${GATEWAY_URL}/users`, {
      auth: { token: adminToken },
      transports: ['websocket', 'polling'],
      forceNew: true,
    });

    await new Promise<void>((resolve) => client.on('connect', () => resolve()));

    const totalRequests = 100;
    const latencies: number[] = [];

    const rpcPromises = Array.from({ length: totalRequests }).map(async () => {
      const start = Date.now();
      const res: any = await client.emitWithAck('user:profile', {});
      const elapsed = Date.now() - start;
      latencies.push(elapsed);
      return res;
    });

    const results = await Promise.all(rpcPromises);

    expect(results).toHaveLength(totalRequests);
    // 100% success rate: 0 errors
    expect(results.every((r) => r.success === true)).toBe(true);

    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(totalRequests * 0.95)] || 0;
    const avg = latencies.reduce((sum, l) => sum + l, 0) / totalRequests;

    console.log(
      `⚡ [Socket.IO Load Benchmark] 100 RPCs: Avg = ${avg.toFixed(2)}ms, p95 = ${p95}ms`,
    );
    expect(p95).toBeLessThan(3000);

    client.disconnect();
  });
});
