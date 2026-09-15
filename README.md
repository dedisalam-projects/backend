# Dedisalam Backend Services

Welcome to the backend monorepo for the Dedisalam project. This repository is built using [Nx](https://nx.dev/) and contains multiple NestJS microservices orchestrated through an API Gateway.

## 🏗️ Architecture

The backend utilizes a **Hybrid Microservices Architecture**:
- **API Gateway**: Exposes pure realtime Socket.IO gateways (`/auth`, `/users`, `/notifications`) alongside RESTful Auth endpoints under `/api/v1/auth` with wildcard `HttpOnly` cookie session management for multi-subdomain microfrontends.
- **User Service**: Handles authentication, user management, and JWT generation. Uses Redis for stateful refresh token rotation and token revocation blacklisting.
- **Notification Service**: Handles user notifications using MongoDB for persistence and real-time RabbitMQ event bridging.

### 🔐 Authentication & Multi-Subdomain Session Management
- **HttpOnly Cookies**: `accessToken` (15m, `Path=/`) and `refreshToken` (7d, `Path=/api/v1/auth`), with wildcard domain `.dedisalam.my.id` in production and host-only in local development.
- **WebSocket Handshake Auth**: Automatically parses `accessToken` from `handshake.headers.cookie` or accepts `handshake.auth.token` / `Authorization: Bearer <token>`.
- **Dual-Support Mode**: Allows seamless interoperability for browser micro-frontends, mobile (`frontend-android`), and desktop (`frontend-windows`).

For a detailed view of the system architecture, please see the [Architecture Overview](docs/architecture/overview.md).

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed on your machine:
- Node.js (v18+)
- Docker & Docker Compose (for running Redis, MongoDB, and RabbitMQ)

### 1. Environment Variables
Copy `.env.example` to `.env` and fill in the required values.
```sh
cp .env.example .env
```
For a full list of configuration options, see the [Configuration Guide](docs/configuration.md).

### 2. Start Infrastructure Services
Run the necessary databases and message brokers managed under `../infrastructure/`:
```sh
npm run infra:up
```
*(This launches MongoDB, Redis, and RabbitMQ via `../infrastructure/docker-compose.dev.yml`)*

To stop infrastructure:
```sh
npm run infra:down
```

### 3. Install Dependencies
```sh
npm install
```

### 4. Run the Applications
You can start all services concurrently using Nx:
```sh
npx nx run-many --target=serve
```
The API Gateway will be available at: `http://localhost:3000/api/v1`

## 📚 API Documentation (Swagger)
The API Gateway exposes interactive API documentation using Swagger UI.
Once the Gateway is running, visit:
👉 **[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

## 🛠️ Development Tasks

To run tasks with Nx for specific projects, use:
```sh
npx nx <target> <project-name>
```
Examples:
```sh
npx nx build gateway
npx nx test user-service
npx nx lint notification-service
```
