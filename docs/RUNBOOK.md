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

Dokumen ini berisi panduan untuk men-deploy dan menjalankan backend microservices ini, baik menggunakan PM2 untuk environment non-containerized maupun menggunakan Docker.

<!-- AUTO-GENERATED -->

## Profil Servis PM2 (Ecosystem)

Konfigurasi di-ekstrak dari `ecosystem.config.js`. Anda dapat menjalankan semua service sekaligus dengan perintah `pm2 start ecosystem.config.js`.

| Service Name | Script | Environment Variables |
|--------------|--------|-----------------------|
| `[[API_GATEWAY|gateway]]` | `dist/apps/gateway/main.js` | `NODE_ENV=production`, `PORT=3000` |
| `[[MICROSERVICES|user-service]]` | `dist/apps/user-service/main.js` | `NODE_ENV=production`, `USER_SERVICE_PORT=3011`, `USER_SERVICE_TCP_PORT=3001` |
| `[[MICROSERVICES|notification-service]]` | `dist/apps/notification-service/main.js` | `NODE_ENV=production`, `NOTIFICATION_SERVICE_PORT=3012`, `NOTIFICATION_SERVICE_TCP_PORT=3002` |

## Deployment dengan Docker

Repositori ini juga memuat konfigurasi multi-stage build untuk setiap service menggunakan Docker.
Dockerfiles tersedia di direktori `docker/`:
- `docker/gateway/Dockerfile`
- `docker/user-service/Dockerfile`
- `docker/notification-service/Dockerfile`

Untuk mem-build production image, jalankan:
```bash
npm run docker:build:prod
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

