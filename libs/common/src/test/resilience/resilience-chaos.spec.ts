import { io, Socket } from 'socket.io-client';

interface ChaosApiResponse {
  success?: boolean;
  data?: {
    id?: string;
    email?: string;
    user?: { id?: string };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

describe('Layer 7: Network Resilience & Chaos Recovery Suite', () => {
  const GATEWAY_URL = process.env['GATEWAY_URL'] || 'http://localhost:3000';
  let accessToken: string;
  let refreshToken: string;
  let userId: string;
  const testEmail = `resilience_user_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  beforeAll(async () => {
    // Register test user
    await fetch(`${GATEWAY_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: 'Resilience Tester',
        role: 'admin',
      }),
    });

    // Login
    const loginRes = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const loginData = (await loginRes.json()) as ChaosApiResponse;
    userId = (loginData.data?.user?.id || loginData.data?.id) as string;

    const headersWithGetSetCookie = loginRes.headers as unknown as {
      getSetCookie?: () => string[];
    };
    const cookies = headersWithGetSetCookie.getSetCookie
      ? headersWithGetSetCookie.getSetCookie()
      : [loginRes.headers.get('set-cookie') || ''];
    for (const c of cookies) {
      const accessMatch = c.match(/accessToken=([^;]+)/);
      if (accessMatch) accessToken = accessMatch[1];
      const refreshMatch = c.match(/refreshToken=([^;]+)/);
      if (refreshMatch) refreshToken = refreshMatch[1];
    }
  }, 10000);

  it('Resilience 1: should gracefully recover and execute RPCs after abrupt client disconnect and reconnect', async () => {
    const userSocket = io(`${GATEWAY_URL}/users`, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      forceNew: true,
    });

    await new Promise<void>((resolve) => userSocket.on('connect', () => resolve()));
    expect(userSocket.connected).toBe(true);

    // Initial RPC works
    const res1 = (await userSocket.emitWithAck('user:profile', {})) as ChaosApiResponse;
    expect(res1.success).toBe(true);

    // Simulate abrupt network drop
    userSocket.disconnect();
    expect(userSocket.connected).toBe(false);

    // Reconnect socket
    const reconnectPromise = new Promise<void>((resolve) => {
      userSocket.on('connect', () => resolve());
    });
    userSocket.connect();
    await reconnectPromise;
    expect(userSocket.connected).toBe(true);

    // Verify socket can immediately continue performing RPCs
    const res2 = (await userSocket.emitWithAck('user:profile', {})) as ChaosApiResponse;
    expect(res2.success).toBe(true);
    expect(res2.data?.email).toBe(testEmail);

    userSocket.disconnect();
  });

  it('Resilience 2: should seamlessly refresh expired/invalid tokens via POST /api/v1/auth/refresh and reconnect', async () => {
    // Wait 1s so JWT issued-at (iat in seconds) advances
    await new Promise((r) => setTimeout(r, 1100));

    // 1. Send REST refresh request with Cookie header
    const refreshRes = await fetch(`${GATEWAY_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refreshToken=${refreshToken}; accessToken=${accessToken}`,
      },
      body: JSON.stringify({
        userId,
        refreshToken,
      }),
    });

    expect(refreshRes.status).toBe(201);
    const refreshJson = (await refreshRes.json()) as ChaosApiResponse;
    expect(refreshJson.success).toBe(true);

    const refreshHeaders = refreshRes.headers as unknown as {
      getSetCookie?: () => string[];
    };
    const refreshCookies = refreshHeaders.getSetCookie
      ? refreshHeaders.getSetCookie()
      : [refreshRes.headers.get('set-cookie') || ''];
    let newAccessToken = '';
    for (const c of refreshCookies) {
      const match = c.match(/accessToken=([^;]+)/);
      if (match) newAccessToken = match[1];
    }

    expect(newAccessToken).toBeTruthy();
    expect(newAccessToken).not.toBe(accessToken);

    // 2. Connect to /users with fresh token
    const newSocket = io(`${GATEWAY_URL}/users`, {
      auth: { token: newAccessToken },
      transports: ['websocket', 'polling'],
      forceNew: true,
    });

    await new Promise<void>((resolve, reject) => {
      newSocket.on('connect', () => resolve());
      newSocket.on('connect_error', (err) => reject(err));
    });

    const profileRes = (await newSocket.emitWithAck('user:profile', {})) as ChaosApiResponse;
    expect(profileRes.success).toBe(true);
    expect(profileRes.data?.email).toBe(testEmail);

    newSocket.disconnect();
  });

  it('Resilience 3: should handle concurrent reconnection storms without socket starvation', async () => {
    const clientCount = 10;
    const sockets: Socket[] = [];

    // Create 10 concurrent sockets
    for (let i = 0; i < clientCount; i++) {
      sockets.push(
        io(`${GATEWAY_URL}/users`, {
          auth: { token: accessToken },
          transports: ['websocket', 'polling'],
          forceNew: true,
        }),
      );
    }

    // Wait for all to connect
    await Promise.all(
      sockets.map(
        (s) =>
          new Promise<void>((resolve) => {
            if (s.connected) resolve();
            else s.on('connect', () => resolve());
          }),
      ),
    );

    // Disconnect all simultaneously
    sockets.forEach((s) => s.disconnect());
    expect(sockets.every((s) => !s.connected)).toBe(true);

    // Reconnect all simultaneously (storm)
    const reconnectPromises = sockets.map(
      (s) =>
        new Promise<void>((resolve) => {
          s.once('connect', () => resolve());
          s.connect();
        }),
    );

    await Promise.all(reconnectPromises);
    expect(sockets.every((s) => s.connected)).toBe(true);

    // Verify all sockets can execute RPCs concurrently
    const rpcResults = (await Promise.all(
      sockets.map((s) => s.emitWithAck('user:profile', {})),
    )) as ChaosApiResponse[];

    expect(rpcResults.every((r) => r.success === true)).toBe(true);

    // Cleanup
    sockets.forEach((s) => s.disconnect());
  });
});
