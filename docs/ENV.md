---
type: reference
tags:
  - env
  - variables
  - config
aliases: ["Environment Variables"]
status: active
---
# Environment Variables Reference

<!-- AUTO-GENERATED -->

Tabel berikut menjelaskan daftar environment variable yang digunakan pada backend berdasarkan `.env.example`.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| **Server Configuration** | | | |
| `NODE_ENV` | Yes | Lingkungan eksekusi aplikasi | `development`, `production` |
| `PORT` | Yes | Port HTTP default untuk API Gateway / Health checks container | `3000` |
| **MongoDB (Shared Instance)** | | | |
| `MONGODB_URI` | Yes | Connection string MongoDB instance (setiap service secara otomatis mengikat ke `dbName` masing-masing: `user_db`, `notification_db`, `dedisalam`) | `mongodb://root:rootpassword@127.0.0.1:27017?authSource=admin` |
| **Redis** | | | |
| `REDIS_URL` | Yes | Connection string Redis (Cache & Session) | `redis://:pass@localhost:6379` |
| **RabbitMQ** | | | |
| `RABBITMQ_URL` | Yes | Connection string AMQP broker untuk seluruh inter-service microservice | `amqp://guest:guest@localhost:5672` |
| **Security & Authentication** | | | |
| `JWT_SECRET` | Yes | Kunci rahasia penandatanganan JWT Access Token | `(string acak aman)` |
| `JWT_EXPIRES_IN` | No | Masa berlaku access token | `15m` |
| `COOKIE_DOMAIN` | No | Domain untuk cross-subdomain cookie di production | `.dedisalam.my.id` |
| `REFRESH_COOKIE_PATH` | No | Spesifik path cookie untuk token refresh | `/api/v1/auth` |

<!-- AUTO-GENERATED -->
