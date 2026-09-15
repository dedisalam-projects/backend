# Realtime Socket.IO Event Catalog & Frontend Integration Guide

Selamat datang di dokumentasi arsitektur **100% Realtime Socket.IO Backend**. Seluruh komunikasi client-server berjalan di atas protokol WebSockets menggunakan library **Socket.IO v4** dengan *Native Acknowledgements* (`emitWithAck`) dan *Room-Based Realtime Broadcasting*.

---

## 1. Arsitektur & Konfigurasi Koneksi

### Multiplexed Namespaces
Semua namespace berjalan pada host dan port yang sama (misal `http://localhost:3000` atau `https://ws.domain.com`). Socket.IO secara otomatis melakukan multiplexing beberapa namespace di atas **1 koneksi fisik TCP/WebSocket**.

| Namespace | Akses | Deskripsi |
|---|---|---|
| `/auth` | Publik | Registrasi, Login, Refresh Token, dan Logout. |
| `/users` | Terautentikasi (JWT) | Profil pengguna, dan operasi Admin CRUD dengan live broadcast. |
| `/notifications` | Terautentikasi (JWT) | Feed notifikasi pribadi dan broadcast massal dari sistem/admin. |

### Dukungan Lintas Subdomain & CORS
Gateway dikonfigurasi dengan dynamic CORS sehingga klien dari subdomain mana pun (`https://app.domain.com`, `https://admin.domain.com`, `http://localhost:3000`, `http://localhost:5173`, dll.) dapat terhubung secara transparan.

### Autentikasi Handshake Token & HttpOnly Cookie (Dual-Support)
Gateway mendukung mode autentikasi ganda untuk fleksibilitas maksimal:
1. **Web Browser (Micro-frontends)**: Browser mengirimkan HttpOnly cookie `accessToken` secara otomatis menggunakan `withCredentials: true` lintas subdomain (`.dedisalam.my.id`), memberikan proteksi total terhadap serangan XSS dan eliminasi URL token leaks.
2. **Mobile & Desktop (`frontend-android`, `frontend-windows`, CLI)**: Token JWT dikirimkan melalui payload `auth: { token }` atau header `authorization: Bearer <token>`.

```typescript
import { io } from 'socket.io-client';

// Opsi 1: Browser Micro-frontends (Otomatis via HttpOnly Cookie)
const usersSocket = io('https://api.dedisalam.my.id/users', {
  withCredentials: true,
  transports: ['websocket', 'polling'],
});

// Opsi 2: Mobile / Native Client (Bearer Auth Token)
const mobileSocket = io('https://api.dedisalam.my.id/users', {
  auth: {
    token: accessToken,
  },
  transports: ['websocket', 'polling'],
});
```

---

## 2. Format Respon & Error Terstandarisasi

Semua pemanggilan fungsi menggunakan pola `emitWithAck` mengembalikan envelope seragam:

### Sukses:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-09-10T15:30:00.000Z"
  }
}
```

### Gagal / Validasi:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | BAD_REQUEST",
    "message": "Human readable error message",
    "details": [ ... ]
  },
  "meta": {
    "timestamp": "2026-09-10T15:30:00.000Z"
  }
}
```

---

## 3. Katalog Event per Namespace

### A. Namespace: `/auth` (Publik)

#### 1. `auth:login`
- **Tipe**: Request-Response (Ack RPC)
- **Payload**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Acknowledge Data**:
  ```json
  {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "43b9d0...",
    "user": {
      "id": "65b...",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "admin"
    }
  }
  ```

#### 2. `auth:register`
- **Tipe**: Request-Response (Ack RPC)
- **Payload**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123!",
    "role": "user"
  }
  ```

#### 3. `auth:refresh`
- **Tipe**: Request-Response (Ack RPC)
- **Payload**:
  ```json
  {
    "userId": "65b...",
    "refreshToken": "43b9d0..."
  }
  ```

#### 4. `auth:logout`
- **Tipe**: Request-Response (Ack RPC)
- **Payload**:
  ```json
  {
    "refreshToken": "43b9d0...",
    "accessToken": "eyJhbGciOi..."
  }
  ```

---

### B. Namespace: `/users` (Memerlukan Token JWT)

#### 1. `user:profile`
- **Tipe**: Request-Response (Ack RPC)
- **Payload**: `{}`
- **Respon**: Mengembalikan profil akun yang sedang login.

#### 2. `user:update_profile`
- **Tipe**: Request-Response (Ack RPC)
- **Payload**:
  ```json
  {
    "name": "New Name",
    "password": "NewPassword123!"
  }
  ```

#### 3. `admin:join`
- **Tipe**: Request-Response (Ack RPC)
- **Akses**: Khusus role `admin` atau `super_admin`.
- **Fungsi**: Mendaftarkan socket admin ke room `admin:users` untuk menerima live update sinkronisasi data user.

#### 4. `admin:users:list`
- **Tipe**: Request-Response (Ack RPC)
- **Akses**: Khusus role `admin` atau `super_admin`.
- **Payload**:
  ```json
  {
    "page": 1,
    "limit": 10,
    "search": "john",
    "role": "admin"
  }
  ```
- **Acknowledge Data**:
  ```json
  {
    "items": [ ... ],
    "meta": {
      "total": 45,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
  ```

#### 5. `admin:users:create`
- **Tipe**: Request-Response (Ack RPC) + Live Broadcast
- **Akses**: Khusus role `admin` atau `super_admin`.
- **Payload**:
  ```json
  {
    "name": "New User",
    "email": "new@example.com",
    "password": "Password123!",
    "role": "user"
  }
  ```
- **Efek Realtime**: Server otomatis membroadcast event `user:created` ke seluruh admin di room `admin:users`.

#### 6. `admin:users:update`
- **Tipe**: Request-Response (Ack RPC) + Live Broadcast
- **Payload**:
  ```json
  {
    "userId": "65b...",
    "name": "Updated Name",
    "role": "admin",
    "isActive": true
  }
  ```
- **Efek Realtime**: Membroadcast event `user:updated` ke room `admin:users`.

#### 7. `admin:users:delete`
- **Tipe**: Request-Response (Ack RPC) + Live Broadcast
- **Payload**:
  ```json
  {
    "userId": "65b..."
  }
  ```
- **Efek Realtime**: Membroadcast event `user:deleted` ke room `admin:users`.

---

### C. Namespace: `/notifications` (Memerlukan Token JWT)

#### 1. `notification:list`
- **Tipe**: Request-Response (Ack RPC)
- **Respon**: Mengambil seluruh riwayat notifikasi user yang sedang login.

#### 2. `notification:mark_read`
- **Tipe**: Request-Response (Ack RPC)
- **Payload**: `{ "id": "notif_id" }`

#### 3. `admin:notification:broadcast`
- **Tipe**: Request-Response (Ack RPC) + Push Event
- **Akses**: Khusus role `admin` atau `super_admin`.
- **Payload**:
  ```json
  {
    "title": "Maintenance Notice",
    "message": "Server update scheduled tonight at 02:00 UTC",
    "type": "WARNING",
    "recipientId": "optional_user_id"
  }
  ```
- **Efek Realtime**: Jika `recipientId` diisi, notifikasi dikirim ke room personal user `user_{userId}` (`notification:new`). Jika kosong, dikirim ke seluruh socket (`notification:broadcast`).

---

## 4. Contoh Integrasi Frontend (React / TanStack Query)

```typescript
import { io } from 'socket.io-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

const usersSocket = io('https://ws.domain.com/users', {
  auth: { token: localStorage.getItem('accessToken') },
});

// 1. Hook untuk Fetch Data User
export function useUsers(page = 1, search = '') {
  return useQuery({
    queryKey: ['users', page, search],
    queryFn: async () => {
      const res = await usersSocket.emitWithAck('admin:users:list', { page, limit: 10, search });
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

// 2. Realtime Multi-Admin Sync Listener
export function useRealtimeUsersSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Bergabung ke room admin
    usersSocket.emitWithAck('admin:join', {});

    // Tangkap live event dari admin lain
    const handleSync = () => {
      // Invalidate cache TanStack Query agar tampilan otomatis refresh tanpa reload halaman
      queryClient.invalidateQueries({ queryKey: ['users'] });
    };

    usersSocket.on('user:created', handleSync);
    usersSocket.on('user:updated', handleSync);
    usersSocket.on('user:deleted', handleSync);

    return () => {
      usersSocket.off('user:created', handleSync);
      usersSocket.off('user:updated', handleSync);
      usersSocket.off('user:deleted', handleSync);
    };
  }, [queryClient]);
}
```
