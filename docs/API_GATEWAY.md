---
type: api
tags:
  - gateway
  - api
  - nestjs
aliases: ["Gateway", "API Gateway"]
status: active
---
# API Gateway Reference

Dokumen ini mendeskripsikan struktur entry-point aplikasi Gateway (HTTP REST dan WebSocket Socket.IO), yang dihasilkan berdasarkan analisis AST secara otomatis dari source code.

<!-- AUTO-GENERATED -->

## Modul & Konfigurasi Utama
- **`AppModule`**, **`AppService`**: Endpoint default (`getHello()`).
- **`GatewayConfigDto`**: Validasi environment variable Gateway.
- **`RedisIoAdapter`**: Adapter [[EVENT_CATALOG|Socket.IO]] menggunakan Redis Pub/Sub (`connectToRedis()`, `createIOServer()`).

## Autentikasi (REST API)
**`AuthController`** (`apps/gateway/src/auth/auth.controller.ts`)
Menyediakan endpoint HTTP untuk manajemen sesi pengguna:
- `login(body, res)`: Autentikasi dan set HTTP-Only cookie.
- `register(body)`: Mendaftar akun baru.
- `refresh(req, body, res)`: Memperbarui access token JWT menggunakan refresh token.
- `logout(req, body, res)`: Menghapus sesi dan cookie otorisasi.
*Metode internal*: `getCookieOptions()`, `getRefreshCookiePath()`, `handleError()`.

## Manajemen Pengguna (REST & WebSocket)
### `UserController`
- `getUsers(query)`: Endpoint REST admin untuk mendapatkan daftar user dengan paginasi.

### `UserGateway` (WebSocket)
Menangani koneksi realtime untuk operasi user profile dan admin:
- *Koneksi*: `handleConnection(client)`, `handleDisconnect(client)`, `extractToken(client)`, `checkAdmin(client)`.
- *Operasi Profil*: `handleGetProfile(client)`, `handleUpdateProfile(client, body)`.
- *Operasi Admin*: `handleAdminJoin(client)`, `handleAdminCreateUser(client, body)`, `handleAdminUpdateUser(client, body)`, `handleAdminDeleteUser(client, body)`, `handleAdminDeleteUsers(client, body)`.

## Notifikasi (REST & WebSocket)
### `NotificationGateway` (WebSocket)
Menangani realtime web socket clients yang listen terhadap notifikasi:
- *Koneksi*: `handleConnection(client)`, `handleDisconnect(client)`, `extractToken(client)`, `checkAdmin(client)`.
- *Operasi Notifikasi*: `handleListNotifications(client)`, `handleMarkAsRead(client, body)`.
- *Broadcast Admin*: `handleBroadcast(client, body)`.

### `NotificationConsumer` (Message Queue RabbitMQ)
Gateway bertindak sebagai consumer untuk event RabbitMQ untuk meneruskannya (push) ke klien [[EVENT_CATALOG|WebSocket Socket.IO]] yang terhubung:
- `handleUserLoggedIn(data)`
- `handleUserCreated(data)`
- `handleUserUpdated(data)`
- `handleUserDeleted(data)`
- `handleNotifyUser(data)`
- `handleBroadcastPush(data)`
- `handleNotificationPush(data)`

<!-- AUTO-GENERATED -->

