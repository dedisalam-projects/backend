---
name: realtime-socketio-crud-sync
description: "Use when replacing REST APIs with Socket.IO WebSockets, building realtime admin dashboards, synchronizing multi-client CRUD state via ack RPC, or enforcing zero-REST pure realtime gateway architecture in NestJS."
tier: local
target-stacks: ["nestjs", "socket.io", "typescript", "redis"]
metadata:
  origin: auto-extracted
---

# Realtime Socket.IO CRUD & Multi-Client State Synchronization

**Extracted:** 2026-09-10  
**Context:** When replacing traditional HTTP REST APIs with 100% Realtime WebSockets for admin dashboards, multi-tenant applications, or cross-subdomain clients requiring instant multi-user synchronization.

## Problem
1. **REST API Polling Overhead**: Traditional REST dashboards require polling or manual page reloads when another user or admin creates, updates, or deletes records.
2. **Missing Request-Response in Standard WebSockets**: Emitting fire-and-forget events makes client-side async/await, loading spinners, and validation error handling tedious and prone to race conditions.
3. **DTO Validation Failures in WebSockets**: Standard NestJS `ValidationPipe` throws `BadRequestException` (an `HttpException`), which breaks or goes unhandled unless caught and routed back to the client's Ack callback.
4. **Cross-Subdomain Cookie Restrictions**: Modern browsers (Safari ITP, Chrome Privacy Sandbox) block cross-subdomain cookies during WebSocket handshakes.

## Solution

### 1. Dual-Dispatch WebSocket Exception Filter
Implement an exception filter that detects whether the client called the handler via an Acknowledgment callback (`emitWithAck`) or as a regular event, formatting validation errors consistently:

```typescript
@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  override catch(exception: any, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const args = host.getArgs();

    let code = 'INTERNAL_ERROR';
    let message = 'An error occurred';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      const res = exception.getResponse() as any;
      if (Array.isArray(res?.message)) {
        code = 'VALIDATION_ERROR';
        message = 'Validation failed';
        details = res.message;
      } else {
        code = res?.error || `HTTP_${exception.getStatus()}`;
        message = res?.message || exception.message;
      }
    }

    const payload = {
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
      meta: { timestamp: new Date().toISOString() },
    };

    // Invoke client acknowledgment callback if present
    const ackCallback = args.find((arg: any) => typeof arg === 'function');
    if (typeof ackCallback === 'function') {
      ackCallback(payload);
    } else if (client && typeof client.emit === 'function') {
      client.emit('exception', payload);
    }
  }
}
```

### 2. Handshake Token Authentication & Subdomain CORS
Extract the JWT from `socket.handshake.auth.token` during connection to remain immune to third-party cookie restrictions across subdomains:

```typescript
// Client initialization (e.g. from admin.domain.com to ws.domain.com)
const socket = io('https://ws.domain.com/users', {
  auth: { token: localStorage.getItem('accessToken') },
  transports: ['websocket', 'polling'],
});
```

### 2.1 Transport-Level Handshake Middleware Guard (DDoS & Memory Leak Defense)
To prevent connection flooding, socket memory runaway, and unnecessary Redis room allocations, validate tokens BEFORE connection acceptance using Socket.IO middleware in `afterInit` rather than only checking inside `handleConnection`:

```typescript
@WebSocketGateway({ namespace: '/users' })
export class UserGateway implements OnGatewayInit {
  constructor(private readonly configService: ConfigService) {}

  afterInit(server: Server) {
    server.use((socket: any, next: (err?: Error) => void) => {
      const token = this.extractToken(socket);
      if (!token) {
        return next(new Error('UNAUTHORIZED: Authentication token is required'));
      }
      try {
        const secret = this.configService.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET is not configured');
        const decoded = jwt.verify(token, secret) as any;
        socket.data = socket.data || {};
        socket.data.user = decoded;
        next(); // Handshake accepted
      } catch {
        next(new Error('UNAUTHORIZED: Invalid or expired token')); // Rejected at transport level
      }
    });
  }
}
```
When rejected, the client fires `badSocket.on('connect_error')` immediately without ever establishing a spurious connection state.

### 3. Hybrid Realtime CRUD: Direct Ack RPC + Room Broadcast
Perform the mutation via `emitWithAck` to return immediate success/validation feedback to the actor, and simultaneously broadcast a live event to a designated room so all other active sessions sync their state without reload:

```typescript
@SubscribeMessage('admin:users:update')
async handleUpdateUser(
  @ConnectedSocket() client: Socket,
  @MessageBody() body: AdminUpdateUserDto,
) {
  this.checkAdmin(client);
  const updatedUser = await this.userService.update(body);

  // 1. Direct Ack to the actor
  const response = { success: true, data: updatedUser };

  // 2. Broadcast to all other connected admins in room
  this.server.to('admin:users').emit('user:updated', updatedUser);

  return response;
}
```

### 4. Client State Invalidation (e.g. TanStack Query)
On the client dashboard, listen to room events to invalidate cache queries automatically:

```typescript
useEffect(() => {
  socket.emitWithAck('admin:join', {});

  const handleSync = () => queryClient.invalidateQueries(['users']);

  socket.on('user:created', handleSync);
  socket.on('user:updated', handleSync);
  socket.on('user:deleted', handleSync);

  return () => {
    socket.off('user:created', handleSync);
    socket.off('user:updated', handleSync);
    socket.off('user:deleted', handleSync);
  };
}, [queryClient]);
```

### 5. Zero-REST Gateway Invariant & Anti-Pattern Guard
To maintain an uncompromising pure realtime architecture, the API Gateway strictly disallows ad-hoc REST/HTTP fallback endpoints:
- **Anti-Pattern:** When legacy frontend components fail with HTTP 404 on endpoints like `/api/v1/auth/login` or `/api/v1/users`, **NEVER** write REST compatibility routes (`httpAdapter.post()`) or mount HTTP body parsers (`express.json()`) in `main.ts` or controllers.
- **Strict Invariant:** The API Gateway is purely a Socket.IO Realtime Engine. The only permitted HTTP routes are `GET /` (serving the static Playground UI) and `GET /health` (container liveness probe).
- **Enforcement Rule:** If an HTTP client needs access, create a migration issue on the frontend repository and migrate the client component to the respective Socket.IO namespace via Ack RPC (`socket.emitWithAck(...)`). Never pollute the backend with REST bridges.

### 6. Microservices Inter-Service Communication: RabbitMQ RPC vs Asynchronous Events
Avoid confusing internal network transports when orchestrating NestJS microservices:
1. **Synchronous Request-Response (RPC via RabbitMQ):**
   Use `ClientProxy.send('pattern', payload).pipe(timeout(...))` for operations requiring immediate responses (e.g. `auth.login`, `user.list`). RabbitMQ implements synchronous request-reply using dynamic `replyTo` callback queues and `correlationId` tracking. No direct TCP or HTTP connections between microservices are required.
2. **Asynchronous Event-Driven Pub/Sub (RabbitMQ Events):**
   Use `ClientProxy.emit('event.name', payload)` for non-blocking notifications (`user.created`, `user.logged_in`, `user.deleted`). Pair with Dead Letter Exchanges (`x-dead-letter-exchange`) and DLQs to prevent poison message drops.
3. **Passive TCP Listeners:**
   In internal microservices, TCP listeners (e.g., ports 4000/3002) must be treated solely as passive socket probes for Docker/Kubernetes container health checks, never as data transport channels.

### 7. Horizontal Cluster Scaling with Redis Adapter (`@socket.io/redis-adapter`)
Because WebSocket connections are stateful and bound to a specific process memory, scaling the Gateway across multiple container instances requires a centralized event bus:
```typescript
const pubClient = new Redis(redisUrl);
const subClient = pubClient.duplicate();
const adapterConstructor = createAdapter(pubClient, subClient);
server.adapter(adapterConstructor);
```
- **Cluster-Wide Broadcasts:** Messages emitted via `server.emit()` reach all connected users across all Gateway nodes.
- **Distributed Rooms:** Calls to `server.to('user_<id>').emit(...)` find the target user regardless of which container node they are connected to.

## When to Use
- When migrating an existing REST API Gateway to a pure Realtime Socket.IO backend.
- When enforcing zero-REST pure realtime gateway architecture and rejecting HTTP fallback routes.
- When orchestrating internal microservices between synchronous RabbitMQ RPC (`send`) and asynchronous events (`emit`).
- When scaling Socket.IO gateways horizontally across multi-container clusters using Redis Pub/Sub adapters.
- When building collaborative Admin Dashboards where multiple operators need instant live updates without polling.
- When validating DTOs with `class-validator` over WebSockets while requiring structured `{ success, error }` Ack responses.
- When serving multiple frontend subdomains with WebSocket authentication.
