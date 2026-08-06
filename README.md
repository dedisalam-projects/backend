# Dedisalam Backend Services

Welcome to the backend monorepo for the Dedisalam project. This repository is built using [Nx](https://nx.dev/) and contains multiple NestJS microservices orchestrated through an API Gateway.

## 🏗️ Architecture

The backend utilizes a **Hybrid Microservices Architecture**:
- **API Gateway**: Exposes RESTful APIs (documented via Swagger) and proxies requests to microservices using RabbitMQ.
- **User Service**: Handles authentication, user management, and JWT generation. Uses Redis for stateful refresh token rotation.
- **Notification Service**: Handles user notifications using MongoDB for persistence.

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
Run the necessary databases and message brokers via Docker Compose:
```sh
docker-compose up -d
```
*(This starts MongoDB, Redis, and RabbitMQ)*

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
