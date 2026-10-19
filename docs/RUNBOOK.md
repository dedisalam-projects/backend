---
type: guide
tags:
  - runbook
  - ops
  - troubleshooting
aliases: ["Runbook","Deployment","Operations"]
status: active
---
# Runbook: Deployment & Operations

Dokumen ini berisi panduan untuk men-deploy dan menjalankan backend microservices ini secara penuh menggunakan Docker.

## Profil Microservices

Semua service diorkestrasi menggunakan Docker Compose dan terhubung melalui Message Broker RabbitMQ serta MongoDB/Redis.

| Service Name | Container / Service | Port Default | Protokol / Transport |
|--------------|---------------------|--------------|-----------------------|
| `[[API_GATEWAY|gateway]]` | `gateway` | `3000` | HTTP / REST / WebSocket |
| `[[MICROSERVICES|user-service]]` | `user-service` | `3011` | RabbitMQ (queue: `user-service`) + HTTP Health |
| `[[MICROSERVICES|notification-service]]` | `notification-service` | `3012` | RabbitMQ (queue: `notification-service`) + HTTP Health |
| `[[MICROSERVICES|blip-services]]` | `blip-services` | `3013` | RabbitMQ (queue: `blip-services`) + HTTP Health |
| `[[MICROSERVICES|auth-service]]` | `auth-service` | `3015` | RabbitMQ (queue: `auth-service`) + HTTP Health |

## Deployment dengan Docker

Repositori ini memuat konfigurasi multi-stage build untuk setiap service menggunakan Docker.
Dockerfiles tersedia di direktori `docker/`:
- `docker/gateway/Dockerfile`
- `docker/user-service/Dockerfile`
- `docker/notification-service/Dockerfile`
- `docker/blip-services/Dockerfile`
- `docker/auth-service/Dockerfile`

### Build & Push Image

Untuk mem-build production image seluruh service:
```bash
npm run docker:build:prod
```

Untuk mem-push image ke Docker registry:
```bash
npm run docker:push:prod
```

### Menjalankan Service dengan Docker Compose

Untuk development lokal dengan Docker Compose:
```bash
# Menjalankan infrastruktur (MongoDB, RabbitMQ, Redis) + Microservices:
docker compose -f ../infrastructure/docker-compose.dev.yml up -d
```

## Dependensi Infrastruktur (Database & Message Broker)

Sistem ini sangat bergantung pada beberapa komponen infrastruktur. Jalankan dependensi ini secara lokal (development) menggunakan Docker Compose:

```bash
npm run infra:up
```

Komponen yang dijalankan oleh infrastruktur (lihat `docker-compose.dev.yml` / `.env.example`):
1. **MongoDB**: Port `27017` (Database NoSQL)
2. **Redis**: Port `6379` (Caching & Session/Socket.IO Adapter)
3. **RabbitMQ**: Port `5672` (AMQP Broker)
<!-- AUTO-GENERATED -->

## Troubleshooting Umum
- **Aplikasi Crash dengan error AMQP**: RabbitMQ belum siap. Pastikan container infrastruktur sudah berjalan.
- **Port Conflict**: Pastikan tidak ada aplikasi lain di lokal yang menggunakan port `3000`, `3011`, `3012`, `3001`, `3002`, `27017`, `6379`, `5672`.

