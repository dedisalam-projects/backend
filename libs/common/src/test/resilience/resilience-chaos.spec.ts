import { io, Socket } from 'socket.io-client';

describe('Layer 7: Network Resilience & Chaos Recovery Suite', () => {
  const GATEWAY_URL = process.env['GATEWAY_URL'] || 'http://localhost:3000';
  let authSocket: Socket;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;
  const testEmail = `resilience_user_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  beforeAll(async () => {
    authSocket = io(`${GATEWAY_URL}/auth`, {
      transports: ['websocket', 'polling'],
      forceNew: true,
    });

    await new Promise<void>((resolve, reject) => {
      authSocket.on('connect', () => resolve());
      authSocket.on('connect_error', (err) => reject(err));
    });

    // Register test user
    await authSocket.emitWithAck('auth:register', {
      email: testEmail,
      password: testPassword,
      name: 'Resilience Tester',
      role: 'admin',
    });

    // Login
    const loginRes: any = await authSocket.emitWithAck('auth:login', {
      email: testEmail,
      password: testPassword,
    });

    accessToken = loginRes.data.accessToken;
    refreshToken = loginRes.data.refreshToken;
    userId = loginRes.data.user.id;
  }, 10000);

  afterAll(() => {
    if (authSocket && authSocket.connected) authSocket.disconnect();
  });

  it('Resilience 1: should gracefully recover and execute RPCs after abrupt client disconnect and reconnect', async () => {
    const userSocket = io(`${GATEWAY_URL}/users`, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      forceNew: true,
    });

    await new Promise<void>((resolve) => userSocket.on('connect', () => resolve()));
    expect(userSocket.connected).toBe(true);

    // Initial RPC works
    const res1: any = await userSocket.emitWithAck('user:profile', {});
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
    const res2: any = await userSocket.emitWithAck('user:profile', {});
    expect(res2.success).toBe(true);
    expect(res2.data.email).toBe(testEmail);

    userSocket.disconnect();
  });

  it('Resilience 2: should seamlessly refresh expired/invalid tokens via auth:refresh and reconnect', async () => {
    // Wait 1s so JWT issued-at (iat in seconds) advances
    await new Promise((r) => setTimeout(r, 1100));

    // 1. Send auth:refresh request
    const refreshRes: any = await authSocket.emitWithAck('auth:refresh', {
      userId,
      refreshToken,
    });

    expect(refreshRes.success).toBe(true);
    expect(refreshRes.data.accessToken).toBeDefined();
    const newAccessToken = refreshRes.data.accessToken;
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

    const profileRes: any = await newSocket.emitWithAck('user:profile', {});
    expect(profileRes.success).toBe(true);
    expect(profileRes.data.email).toBe(testEmail);

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
    const rpcResults: any[] = await Promise.all(
      sockets.map((s) => s.emitWithAck('user:profile', {})),
    );

    expect(rpcResults.every((r) => r.success === true)).toBe(true);

    // Cleanup
    sockets.forEach((s) => s.disconnect());
  });
});
