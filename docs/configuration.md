# Environment Variables Configuration

The backend services rely on environment variables for configuration. All required variables should be defined in a `.env` file at the root of the project (you can copy from `.env.example`).

## Variables Reference

| Variable Name | Description | Default / Example Value |
| --- | --- | --- |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` |
| `PORT` | The port the Gateway REST API listens on | `3000` |
| `GATEWAY_TCP_PORT` | The port the Gateway TCP listener binds to | `4000` |
| `MONGODB_URI` | Connection string for MongoDB (Users, Notifications) | `mongodb://localhost:27017/dedisalam` |
| `REDIS_URL` | Connection string for Redis (Session, Websockets) | `redis://localhost:6379` |
| `RABBITMQ_URL` | Connection string for RabbitMQ Message Broker | `amqp://guest:guest@localhost:5672` |
| `JWT_SECRET` | Secret key used to sign and verify JWT Access Tokens | **MUST BE CHANGED IN PRODUCTION** |

> **⚠️ WARNING:** 
> Do not commit `.env` files to version control. The `JWT_SECRET` must be kept extremely secure, as it is used to validate all incoming authenticated requests.
