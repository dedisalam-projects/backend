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
| `PORT` | Yes | Port untuk REST API / HTTP | `3000` |
| `GATEWAY_TCP_PORT` | No | Port TCP internal untuk [[API_GATEWAY|Gateway]] microservices | `4000` |
| **MongoDB** | | | |
| `MONGODB_URI` | Yes | Connection string untuk database MongoDB | `mongodb://user:pass@localhost:27017/db` |
| **Redis** | | | |
| `REDIS_URL` | Yes | Connection string Redis (Cache & Session) | `redis://:pass@localhost:6379` |
| **RabbitMQ** | | | |
| `RABBITMQ_URL` | Yes | Connection string AMQP broker | `amqp://guest:guest@localhost:5672` |
| **Security & Authentication** | | | |
| `JWT_SECRET` | Yes | Kunci rahasia penandatanganan JWT | `(string acak)` |
| `COOKIE_DOMAIN` | No | Domain untuk cross-subdomain cookie di production | `.dedisalam.my.id` |
| `REFRESH_COOKIE_PATH` | No | Spesifik path cookie untuk token refresh | `/api/v1/auth` |
| **Infrastructure Initialization Credentials** | | | |
| `MONGO_INITDB_ROOT_USERNAME` | No | Username init Docker MongoDB | `root` |
| `MONGO_INITDB_ROOT_PASSWORD` | No | Password init Docker MongoDB | `...` |
| `RABBITMQ_USER` | No | Username init Docker RabbitMQ | `guest` |
| `RABBITMQ_PASS` | No | Password init Docker RabbitMQ | `...` |
| `REDIS_PASSWORD` | No | Password init Docker Redis | `...` |
| **Infrastructure Host Bind IPs** | | | |
| `MONGO_BIND_IP` | No | IP bind lokal untuk MongoDB | `127.0.0.1` |
| `REDIS_BIND_IP` | No | IP bind lokal untuk Redis | `127.0.0.1` |
| `RABBITMQ_BIND_IP` | No | IP bind lokal untuk RabbitMQ | `127.0.0.1` |

<!-- AUTO-GENERATED -->

