---
name: docker-backend-orchestration
description: "Use when starting, building, configuring, or troubleshooting Docker containers, Compose profiles, microservice infrastructure, or when building and pushing production Docker images to Docker Hub."
tier: local
target-stacks: ["nestjs", "docker", "mongodb", "rabbitmq", "redis", "nginx", "nx", "dockerhub"]
metadata:
  origin: auto-extracted
---

# Docker Backend Orchestration

**Extracted:** 2026-09-10  
**Context:** Multi-tier Docker Compose, multi-stage container build orchestration, pre-development infrastructure verification, and production Docker Hub release pipeline for the Dedisalam Nx monorepo backend services.

## Problem
In this microservice architecture, non-backend infrastructure (databases, brokers, reverse proxy, monitoring) is managed under `../infrastructure/` by DevOps, while application Dockerfiles remain in `backend/docker/`. Developers and agents need a clear reference for local development, pre-development readiness verification, and the mandatory production output contract (pushing immutable container images to Docker Hub).

## Architecture & Topology

### 1. Separation of Responsibilities
- **Backend Repository (`backend/`)**:
  - Contains NestJS source code and application container build definitions:
    - `docker/gateway/Dockerfile` (HTTP :3000, TCP :4000, WebSocket)
    - `docker/user-service/Dockerfile` (HTTP :3001, TCP :4001, Auth & JWT)
    - `docker/notification-service/Dockerfile` (HTTP :3002, TCP :4002, Notifications)
  - Provides npm scripts for local infrastructure orchestration (`infra:up`, `infra:down`, `infra:logs`).
  - Builds and pushes production release images to Docker Hub.
- **DevOps Infrastructure (`../infrastructure/`)**:
  - `docker/mongodb/`: Initialization scripts (`mongo-init.js`) for `user_db` and `notification_db`.
  - `docker/nginx/`: Reverse proxy configs (`nginx.conf`, `nginx.dev.conf`) and SSL certs.
  - `docker/prometheus/`: Metrics scraping (`prometheus.yml`) and alerts (`alerts.yml`).
  - `docker/grafana/`: Dashboards (`nestjs.json`) and datasources.
  - Compose definitions (`docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.dev.server.yml`, `docker-compose.prod.yml`).

### 2. Multi-Stage Dockerfile Pattern (Nx Monorepo)
Each microservice uses a 3-stage Node 24 Alpine build:
1. `deps`: Runs `npm ci` for lockfile integrity.
2. `builder`: Copies `node_modules` and sources, then executes `npx nx build <service-name> --configuration=production`.
3. `production`: Runs `npm ci --only=production --ignore-scripts`, copies compiled artifact from `/app/dist/apps/<service-name>`, drops root to `USER node`, and starts via `node dist/apps/<service-name>/main.js`.

---

## Pre-Development Infrastructure Readiness Verification Protocol

Before starting any backend feature development, serving microservices (`npx nx run-many --target=serve`), or executing integration tests, always verify that the required backing infrastructure services are operational:

### 1. Verification Checklist
Check that backing services are accepting connections on their standard ports:
- **MongoDB** (Port `27017`): User Service & Notification Service datastore.
- **RabbitMQ** (Port `5672` & `15672`): Asynchronous inter-service communication bus.
- **Redis** (Port `6379`): Session storage & JWT refresh token rotation cache.

Fast probe command:
```powershell
# Quick port probe on Windows:
27017, 5672, 6379 | ForEach-Object {
    $t = Test-NetConnection -ComputerName localhost -Port $_ -WarningAction SilentlyContinue
    [PSCustomObject]@{ Port = $_; Open = $t.TcpTestSucceeded }
}
```

### 2. Action When Infrastructure Is Not Ready (Halt & DevOps Escalation)
If any required infrastructure service is unreachable or not running:
- **HALT DEVELOPMENT**: Do not attempt to run NestJS services against offline or missing databases.
- **DO NOT MODIFY DEVOPS CONFIGS**: Do not unilaterally alter files inside `../infrastructure/`.
- **IMMEDIATELY NOTIFY USER**: State explicitly which service(s) are offline and request the user to ask the **DevOps team** to prepare and start the infrastructure.
- **User Notification Standard**:
  > "⚠️ **Infrastructure Not Ready**: The backing infrastructure services [list services, e.g., MongoDB on :27017, RabbitMQ on :5672] are currently unreachable. Because infrastructure is maintained by DevOps in `../infrastructure/`, please ask the DevOps team to prepare/start the required services (or run `npm run infra:up` if local container execution is approved) before we proceed with development."

---

## Production Release & Docker Hub Push Workflow (Mandatory Output Contract)

Production deployments must never run from uncompiled source code or ad-hoc builds on the production host. The mandatory output of the production release pipeline is an immutable Docker image pushed to Docker Hub registry:

### 1. Registry Naming & Tagging Standard
- **Registry / Namespace**: `dedisalam/` (Docker Hub)
- **Service Repositories**:
  - `dedisalam/backend-gateway`
  - `dedisalam/backend-user-service`
  - `dedisalam/backend-notification-service`
- **Tagging Strategy**:
  - Semantic / Commit SHA tag: `dedisalam/backend-<service>:v1.0.0` (immutable artifact)
  - Latest release pointer: `dedisalam/backend-<service>:latest`

### 2. Build & Push Commands (Executed from `backend/` Root)
```bash
# 1. Authenticate to Docker Hub
echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin

# 2. Build production multi-stage images
docker build -t dedisalam/backend-gateway:latest -f docker/gateway/Dockerfile .
docker build -t dedisalam/backend-user-service:latest -f docker/user-service/Dockerfile .
docker build -t dedisalam/backend-notification-service:latest -f docker/notification-service/Dockerfile .

# 3. Push images to Docker Hub
docker push dedisalam/backend-gateway:latest
docker push dedisalam/backend-user-service:latest
docker push dedisalam/backend-notification-service:latest
```

### 3. Production Deployment Consumption (Executed in `infrastructure/`)
On the production host, DevOps pulls pre-built immutable images without needing access to backend source code or build tools:
```bash
cd /path/to/infrastructure
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## The 4 Compose Execution Profiles

### Profile 1: Local Hybrid Development (Recommended for daily coding)
Run backing databases in Docker while running NestJS microservices natively on host for fast hot-reload:
```bash
# From backend repository root:
npm run infra:up

# Run microservices concurrently on host:
npx nx run-many --target=serve

# Stop infrastructure when done:
npm run infra:down
```
*Host Port Mappings:* MongoDB (`27017`), RabbitMQ (`5672`, `15672`), Redis (`6379`).

### Profile 2: Local Full Containerized Stack
Run all services, edge proxy, and observability inside containers via infrastructure root:
```bash
cd ../infrastructure
docker compose up -d

# Check health of all services
docker compose ps
```

### Profile 3: Development Server (`172.16.254.2`)
Deploy to the dedicated private dev server with strict production isolation:
```bash
ssh dedisalam@172.16.254.2
cd /path/to/infrastructure
docker compose -p fullstack-dev -f docker-compose.dev.server.yml up -d --build

# View real-time dev server logs
docker compose -p fullstack-dev -f docker-compose.dev.server.yml logs -f
```
*Isolation attributes:* Uses `-p fullstack-dev`, network `app-network-dev`, `<name>-dev` containers, and `dev_<name>` volumes. Cloudflare is excluded to keep public production traffic untouched.

### Profile 4: Production Deployment
Hardened configuration with bound internal IPs, log rotation, and locked privileges:
```bash
cd /path/to/infrastructure
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```
*Security constraints:* Explicit internal IP binding, logging capped at 10MB x 3 files, `no-new-privileges:true`.

---

## Healthcheck & Dependency Graph
Services use strict `condition: service_healthy` startup gates:
```
mongodb (mongosh ping)       ───┐
rabbitmq (diagnostics ping)   ───┼──> user-service & notification-service ───┐
redis (redis-cli ping)       ───┘                                              ├──> gateway ──> nginx
```

## Troubleshooting Commands

```bash
# View infrastructure logs from backend
npm run infra:logs

# Inspect container healthcheck test output
docker inspect --format='{{json .State.Health}}' gateway | jq

# Tail logs of a specific service
docker compose -f ../infrastructure/docker-compose.dev.yml logs -f user-service

# Force-rebuild single service image without cache
docker compose -f ../infrastructure/docker-compose.yml build --no-cache gateway
```

## When to Use
- When starting or stopping backing datastores for local backend development.
- When containerizing a new NestJS microservice or updating Nx Dockerfiles in `backend/docker/`.
- When modifying Nginx reverse proxy routes or WebSocket configurations in `../infrastructure/`.
- When deploying or debugging the dev server stack (`docker-compose.dev.server.yml`).
- When starting any backend development or testing task to verify that MongoDB, RabbitMQ, and Redis are ready.
- When building, tagging, or pushing production container images to Docker Hub.
