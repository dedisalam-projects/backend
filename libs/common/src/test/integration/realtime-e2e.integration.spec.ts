import { io, Socket } from 'socket.io-client';

interface TestApiResponse {
  success?: boolean;
  message?: string;
  data?: {
    id?: string;
    _id?: string;
    email?: string;
    name?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface TestBroadcastData {
  event?: string;
  data?: {
    email?: string;
    name?: string;
    userId?: string;
    [key: string]: unknown;
  };
  email?: string;
  name?: string;
  userId?: string;
  [key: string]: unknown;
}

describe('Layer 4: Automated Realtime Socket.IO E2E Integration Suite', () => {
  const GATEWAY_URL = process.env['GATEWAY_URL'] || 'http://localhost:3000';
  let adminSocket1: Socket;
  let adminSocket2: Socket;
  let notificationSocket: Socket;
  let adminToken: string;
  const testEmail = `integration_admin_${Date.now()}@example.com`;
  const testPassword = 'StrongPassword123!';
  let createdUserId: string;

  afterAll(() => {
    if (adminSocket1 && adminSocket1.connected) adminSocket1.disconnect();
    if (adminSocket2 && adminSocket2.connected) adminSocket2.disconnect();
    if (notificationSocket && notificationSocket.connected) notificationSocket.disconnect();
  });

  it('Step 1: should reject invalid registration DTO with Bad Request over REST', async () => {
    const res = await fetch(`${GATEWAY_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email-format',
        password: '123',
        name: 'X',
      }),
    });

    expect(res.status).toBe(400);
    const json = (await res.json()) as TestApiResponse;
    expect(json.message).toBeDefined();
  });

  it('Step 2: should register and login admin user successfully over REST and set HttpOnly cookies', async () => {
    const registerRes = await fetch(`${GATEWAY_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: 'Integration Admin',
        role: 'admin',
      }),
    });

    expect(registerRes.status).toBe(201);
    const regJson = (await registerRes.json()) as TestApiResponse;
    expect(regJson.success).toBe(true);

    const loginRes = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    expect(loginRes.status).toBe(201);
    const loginJson = (await loginRes.json()) as TestApiResponse;
    expect(loginJson.success).toBe(true);

    const headersWithGetSetCookie = loginRes.headers as unknown as {
      getSetCookie?: () => string[];
    };
    const cookies = headersWithGetSetCookie.getSetCookie
      ? headersWithGetSetCookie.getSetCookie()
      : [loginRes.headers.get('set-cookie') || ''];
    let extractedToken = '';
    for (const c of cookies) {
      const match = c.match(/accessToken=([^;]+)/);
      if (match) extractedToken = match[1];
    }
    expect(extractedToken).toBeTruthy();
    adminToken = extractedToken;
  });

  it('Step 3: should authenticate handshake to /users namespace with Bearer token', (done) => {
    adminSocket1 = io(`${GATEWAY_URL}/users`, {
      auth: { token: adminToken },
      transports: ['websocket', 'polling'],
      forceNew: true,
    });

    adminSocket1.on('connect', () => {
      expect(adminSocket1.connected).toBe(true);
      done();
    });

    adminSocket1.on('connect_error', (err) => done(err));
  });

  it('Step 4: should fetch user profile via user:profile ack RPC', async () => {
    const profileRes = (await adminSocket1.emitWithAck('user:profile', {})) as TestApiResponse;
    expect(profileRes).toBeDefined();
    expect(profileRes.success).toBe(true);
    expect(profileRes.data?.email).toBe(testEmail);
  });

  it('Step 5: should establish multi-admin live collaboration and broadcast user:created', async () => {
    await new Promise<void>((resolve, reject) => {
      adminSocket2 = io(`${GATEWAY_URL}/users`, {
        auth: { token: adminToken },
        transports: ['websocket', 'polling'],
        forceNew: true,
      });
      adminSocket2.on('connect', () => resolve());
      adminSocket2.on('connect_error', (err) => reject(err));
    });

    // Both join admin room
    const join1 = (await adminSocket1.emitWithAck('admin:join', {})) as TestApiResponse;
    const join2 = (await adminSocket2.emitWithAck('admin:join', {})) as TestApiResponse;
    expect(join1.success).toBe(true);
    expect(join2.success).toBe(true);

    const targetEmail = `created_user_${Date.now()}@example.com`;

    // Listen for realtime broadcast on adminSocket2
    let liveCreatedData: TestBroadcastData | null = null;
    adminSocket2.once('user:created', (payload: TestBroadcastData) => {
      liveCreatedData = payload;
    });

    const createRes = (await adminSocket1.emitWithAck('admin:users:create', {
      email: targetEmail,
      password: 'UserPassword123!',
      name: 'Created Realtime User',
      role: 'user',
    })) as TestApiResponse;

    expect(createRes.success).toBe(true);
    createdUserId = (createRes.data?.id || createRes.data?._id) as string;
    expect(createdUserId).toBeDefined();

    // Wait 300ms for broadcast
    await new Promise((r) => setTimeout(r, 300));
    expect(liveCreatedData).toBeDefined();
    const createdData = liveCreatedData as unknown as TestBroadcastData;
    if (createdData?.event) {
      expect(createdData.event).toBe('USER_CREATED');
    }
    const createdPayload = createdData?.data || createdData;
    expect(createdPayload?.email).toBe(targetEmail);
  });

  it('Step 6: should broadcast user:updated event when user is modified', async () => {
    let liveUpdatedData: TestBroadcastData | null = null;
    adminSocket2.once('user:updated', (payload: TestBroadcastData) => {
      liveUpdatedData = payload;
    });

    const updateRes = (await adminSocket1.emitWithAck('admin:users:update', {
      userId: createdUserId,
      name: 'Renamed Realtime User',
    })) as TestApiResponse;

    expect(updateRes.success).toBe(true);
    await new Promise((r) => setTimeout(r, 300));
    expect(liveUpdatedData).toBeDefined();
    const updatedData = liveUpdatedData as unknown as TestBroadcastData;
    if (updatedData?.event) {
      expect(updatedData.event).toBe('USER_UPDATED');
    }
    const updatedPayload = updatedData?.data || updatedData;
    expect(updatedPayload?.name).toBe('Renamed Realtime User');
  });

  it('Step 7: should broadcast user:deleted event when user is removed', async () => {
    let liveDeletedData: TestBroadcastData | null = null;
    adminSocket2.once('user:deleted', (payload: TestBroadcastData) => {
      liveDeletedData = payload;
    });

    const deleteRes = (await adminSocket1.emitWithAck('admin:users:delete', {
      userId: createdUserId,
    })) as TestApiResponse;

    expect(deleteRes.success).toBe(true);
    await new Promise((r) => setTimeout(r, 300));
    expect(liveDeletedData).toBeDefined();
    const deletedData = liveDeletedData as unknown as TestBroadcastData;
    if (deletedData?.event) {
      expect(deletedData.event).toBe('USER_DELETED');
    }
    const deletedPayload = deletedData?.data || deletedData;
    expect(deletedPayload?.userId).toBe(createdUserId);
  });

  it('Step 8: should connect to /notifications namespace, list, and broadcast notifications', async () => {
    await new Promise<void>((resolve, reject) => {
      notificationSocket = io(`${GATEWAY_URL}/notifications`, {
        auth: { token: adminToken },
        transports: ['websocket', 'polling'],
        forceNew: true,
      });
      notificationSocket.on('connect', () => resolve());
      notificationSocket.on('connect_error', (err) => reject(err));
    });

    let liveBroadcastReceived = false;
    notificationSocket.once('notification:broadcast', () => {
      liveBroadcastReceived = true;
    });

    const broadcastRes = (await notificationSocket.emitWithAck('admin:notification:broadcast', {
      title: 'Integration Test Alert',
      message: 'Testing realtime notification distribution',
      type: 'SUCCESS',
    })) as TestApiResponse;

    expect(broadcastRes).toBeDefined();
    expect(broadcastRes.success).toBe(true);

    await new Promise((r) => setTimeout(r, 300));
    expect(liveBroadcastReceived).toBe(true);
  });
});
