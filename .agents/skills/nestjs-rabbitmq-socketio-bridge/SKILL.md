---
name: nestjs-rabbitmq-socketio-bridge
description: "Use when bridging events from a message broker (RabbitMQ) to a realtime frontend via WebSockets in a NestJS Microservices architecture."
metadata:
  origin: auto-extracted
---

# NestJS RabbitMQ to Socket.IO Bridge

**Extracted:** 2026-09-06
**Context:** When a stateless microservice handles an action (e.g., login, payment) and needs to notify a client in realtime, but the WebSocket Gateway lives in a separate entrypoint/gateway service.

## Problem
WebSockets require stateful connections and are usually bound to the API Gateway. Backend microservices only communicate via a message broker (like RabbitMQ) and cannot directly push socket events to connected clients. 

## Solution
Use a Controller with `@EventPattern` to listen to the message broker, and inject the `WebSocketGateway` to emit the event to the connected clients.

1. Create the Gateway:
```typescript
@WebSocketGateway({ namespace: '/notifications' })
export class NotificationGateway {
  @WebSocketServer() server!: Server;
}
```

2. Bridge it in the Controller:
```typescript
@Controller('api/v1/notifications')
export class NotificationController {
  constructor(private readonly notificationGateway: NotificationGateway) {}

  @EventPattern('user.logged_in') // Listen to RabbitMQ
  handleUserLoggedIn(@Payload() data: any) {
    // Emit to connected Socket.IO clients
    this.notificationGateway.server.emit('login_event', data);
  }
}
```

## When to Use
- When integrating `@nestjs/websockets` with `@nestjs/microservices`.
- When you need to broadcast realtime notifications triggered by a background service or a separate microservice via RabbitMQ/Redis/Kafka.


> [!IMPORTANT]
> **Rule Adherence**: Always strictly follow the `nestjs-rabbitmq-socketio-bridge` conventions outlined above to ensure workspace consistency and prevent regressions.
