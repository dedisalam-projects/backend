---
name: realtime-socketio-crud-sync
description: "Use when replacing REST APIs with Socket.IO WebSockets, building realtime admin dashboards, or synchronizing multi-client CRUD state via ack RPC and room broadcasts in NestJS."
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

## When to Use
- When migrating an existing REST API Gateway to a pure Realtime Socket.IO backend.
- When building collaborative Admin Dashboards where multiple operators need instant live updates without polling.
- When validating DTOs with `class-validator` over WebSockets while requiring structured `{ success, error }` Ack responses.
- When serving multiple frontend subdomains with WebSocket authentication.
