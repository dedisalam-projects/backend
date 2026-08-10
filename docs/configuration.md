# Environment Variables Configuration

The backend services rely on environment variables for configuration. All required variables should be defined in a `.env` file at the root of the project (you can copy from `.env.example`).

## Variables Reference

| Variable Name | Description | Default / Example Value |
| --- | --- | --- |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` |
| `PORT` | The port the Gateway REST API listens on | `3000` |
| `GATEWAY_TCP_PORT` | The port the Gateway TCP listener binds to | `4000` |
| `MONGODB_URI` | Connection string for MongoDB (Users, Notifications) | `mongodb://root:4r!M4n3hKuN40n@localhost:27017/dedisalam?authSource=admin` |
| `REDIS_URL` | Connection string for Redis (Session, Websockets) | `redis://:4r!M4n3hKuN40n@localhost:6379` |
| `RABBITMQ_URL` | Connection string for RabbitMQ Message Broker | `amqp://guest:4r!M4n3hKuN40n@localhost:5672` |
| `JWT_SECRET` | Secret key used to sign and verify JWT Access Tokens | **MUST BE CHANGED IN PRODUCTION** |
| `MONGO_INITDB_ROOT_PASSWORD` | Root password for MongoDB Initialization | `4r!M4n3hKuN40n` |
| `REDIS_PASSWORD` | Password for Redis access (`requirepass`) | `4r!M4n3hKuN40n` |
| `RABBITMQ_PASS` | Password for RabbitMQ default user | `4r!M4n3hKuN40n` |

> [!IMPORTANT]
> **Production Configuration & Security**:
> All credentials in production (`docker-compose.prod.yml`) are injected dynamically via environment variable substitution (e.g., `${MONGO_INITDB_ROOT_PASSWORD}`). Hardcoding secrets directly in the infrastructure YAML files is strictly prohibited under the Zero Trust principle.

> [!WARNING]
> Do not commit `.env` files to version control. The `JWT_SECRET` and database passwords must be kept extremely secure in production.
