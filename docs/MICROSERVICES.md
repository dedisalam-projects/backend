---
type: architecture
tags:
  - microservices
  - architecture
aliases: ["Microservices", "User Service", "Notification Service", "Common Library"]
status: active
---
# Microservices & Common Library Reference

Dokumen ini berisi struktur layanan backend internal (`user-service`, `notification-service`) yang berjalan sebagai microservice via TCP/RabbitMQ, serta pustaka kode umum (Libraries) yang dibagikan antar layanan.

<!-- AUTO-GENERATED -->

## 1. User Service (`apps/user-service`)

Menangani bisnis logik, interaksi dengan MongoDB, dan event pengguna.

### **`AuthController`** & **`AuthService`**
Menerima RPC / Message Queue (dari [[API_GATEWAY|Gateway]]) untuk eksekusi logika inti:
- **Autentikasi**: `login(data)`, `register(data)`, `refresh(data)`, `logout(data)`.
- **Profil User**: `getProfile(userId)`, `updateProfile(data)`.
- **Admin**: `getAllUsers()`, `createUser(data)`, `getUsersPaginated(query)`, `updateUserByAdmin(userId, data)`, `deleteUser(userId)`, `deleteUsers(userIds)`.

### **`AppController`** & **`AppService`**
- `hello(data, context)` / `getHello(name)`
- `handleTestEvent(data)`

### **`HealthController`**
- `check()`: Endpoint liveness/readiness probe dari layanan (Kubernetes/Docker healthcheck).

---

## 2. Notification Service (`apps/notification-service`)

Menangani penyimpanan dan pengiriman notifikasi antar pengguna.

### **`AppController`**
Menerima event RabbitMQ/TCP dan memanggil Service layer:
- **Core event**: `handleNotificationSend(data)`, `handleNotificationList(data)`, `handleMarkAsRead(data)`, `handleNotificationBroadcast(data)`.
- **Event listener**: `handleUserCreated(data)`, `handleUserUpdated(data)`, `handleUserDeleted(data)`, `handleUserLoggedIn(data)`.

### **`AppService`**
- `processNotification(message, userId, type)`: Bisnis logik untuk membuat dokumen notifikasi di DB.
- `getNotifications(userId)`
- `markAsRead(id, userId)`
- `broadcastNotification(data)`

### **`HealthController`**
- `check()`: Endpoint liveness/readiness probe.

---

## 3. Common Library (`libs/common`)

Berisi kode yang dibagikan across seluruh aplikasi di dalam Nx Workspace ini.

### DTOs (Data Transfer Objects)
- `AdminCreateUserDto`, `AdminUpdateUserDto`, `UserPaginationQueryDto`
- `RegisterDto`, `LoginDto`, `RefreshTokenDto`
- `NotificationBroadcastDto`

### Filters (Error Handling)
- `HttpExceptionFilter`: Menangkap error REST dan menyeragamkan respons JSON HTTP.
- `RpcExceptionFilter`: Menangkap error Microservice TCP/AMQP.
- `WsExceptionFilter`: Menangkap error dan mengirimnya via Socket.IO WebSocket Ack/Emit.

### Guards & Strategies (Otorisasi)
- **HTTP**: `JwtAuthGuard`, `JwtStrategy` (Pengecekan token bearer), `RolesGuard` (Pengecekan RBAC role user vs admin).
- **WebSocket**: `WsJwtGuard` (Ekstraksi token dari Handshake HTTP / Header WS), `WsRolesGuard`.

### Interceptors
- `CorrelationIdInterceptor`: Menambahkan trace ID pada log.
- `TransformInterceptor`: Memodifikasi format payload respons akhir.

<!-- AUTO-GENERATED -->

