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
- **MANDATORY GITHUB ISSUE ESCALATION**:
  Always create a tracked GitHub Issue in `dedisalam-projects/infrastructure` using `gh issue create`:
  ```bash
  gh issue create --repo dedisalam-projects/infrastructure \
    --title "fix(infra): <brief summary of failure>" \
    --body "## Problem Summary`n<symptoms>`n`n## Root Cause`n<diagnostics>`n`n## Recommended Fix`n<steps>"
  ```
- **NOTIFY USER WITH DIRECT LINK**: Provide the direct URL to the created GitHub issue so the user and DevOps team can track resolution.
- **User Notification Standard**:
  > "⚠️ **Infrastructure Not Ready**: Backing infrastructure issue detected. GitHub issue has been logged at https://github.com/dedisalam-projects/infrastructure/issues/<id>. Please allow the DevOps team to remediate the infrastructure before we proceed."

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

### Profile 3: Production Host Direct Access (`172.16.254.2` - ThinkCentre)
The bare-metal production server (`thinkcentre`) at `172.16.254.2` hosts both native Jenkins CI/CD (port `8080`) and the production Docker containers. When connected to the local network (LAN/WiFi), access Docker and services directly:
```bash
ssh dedisalam@172.16.254.2
cd /path/to/infrastructure
docker compose -f docker-compose.prod.yml ps
```

#### Remote Docker CLI & Context Access (Direct from Host)
Access the production Docker daemon directly from Windows via SSH tunnel using key-based authentication (`C:\Users\dedis\.ssh\id_rsa`) and `PROD_SERVER_IP` (`172.16.254.2`):

1. **Ad-hoc Remote Execution (`-H` flag)**:
   ```powershell
   docker.exe -H "ssh://dedisalam@$([Environment]::GetEnvironmentVariable('PROD_SERVER_IP','User'))" ps
   docker.exe -H "ssh://dedisalam@$([Environment]::GetEnvironmentVariable('PROD_SERVER_IP','User'))" logs -f --tail 100 gateway
   docker.exe -H "ssh://dedisalam@$([Environment]::GetEnvironmentVariable('PROD_SERVER_IP','User'))" restart user-service
   ```

2. **Docker Context Switching (Persistent Profile)**:
   ```powershell
   # Context: prod-server (registered to ssh://dedisalam@172.16.254.2)
   # Run command using context (Recommended):
   docker.exe --context prod-server ps
   docker.exe --context prod-server logs -f gateway

   # Or switch globally:
   docker.exe context use prod-server
   # Revert to local desktop:
   docker.exe context use desktop-linux
   ```

### Profile 4: Production Deployment
Hardened configuration with bound internal IPs, log rotation, and locked privileges:
```bash
cd /path/to/infrastructure
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```
*Security constraints:* Explicit internal IP binding, logging capped at 10MB x 3 files, `no-new-privileges:true`.

#### Port Exposure & Network Isolation Security Policy
1. **Production Environment (Jenkins / Production Server `172.16.254.2`)**:
   - **Strict Minimal Ingress**: Only the **Backend Gateway** (`:3000`, `:4000`) and **Frontend** (`:80`, `:443`) are permitted to expose `ports:` to the host network.
   - **Zero Host Exposure for Internal Services**: Datastores (`mongodb`, `redis`, `rabbitmq`) and internal microservices (`user-service`, `notification-service`) **MUST NOT** define host `ports:` bindings in `docker-compose.prod.yml`.
   - **Pure Internal Mesh**: All internal services must communicate strictly through Docker's internal bridge network (`fullstack-infrastructure_default`) using service DNS names (`mongodb:27017`, `redis:6379`, `rabbitmq:5672`, `user-service:3001`, `notification-service:3002`).
2. **Local Developer PC Environment (`docker-compose.dev.yml`)**:
   - Full port exposure (`27017`, `6379`, `5672`, `15672`, `3011`, `3012`) is strictly restricted to local development PCs (`npm run infra:up`) to enable native debugging, hot-reloading on host, test runners, and database GUI clients (Compass, RedisInsight).

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


> [!IMPORTANT]
> **Rule Adherence**: Always strictly follow the `docker-backend-orchestration` conventions outlined above to ensure workspace consistency and prevent regressions.
