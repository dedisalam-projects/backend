---
name: realtime-microservices-testing-matrix
description: "Use when selecting, designing, or implementing advanced testing strategies (load testing, containerized integration, contract verification, mutation, chaos) for realtime WebSocket and microservice architectures."
tier: local
target-stacks: ["nestjs", "socketio", "rabbitmq", "jest", "artillery", "testcontainers", "pact", "fast-check"]
metadata:
  origin: auto-extracted
---

# Realtime & Microservices Multi-Layer Testing Matrix

**Extracted:** 2026-09-11  
**Context:** When building event-driven microservices with pure Socket.IO WebSockets and RabbitMQ message brokers, unit tests alone are insufficient to guarantee production stability under high concurrency, network partitions, and inter-service schema changes.

---

## The 7-Layer Realtime Testing Matrix

| Layer | Testing Scope | Tool | Failure Mode Detected | Run Frequency |
|---|---|---|---|:---:|
| **1. Unit & Branch** | Isolated functions, guards, filters | **Jest** | Logic regressions, uncovered branches | Every commit / PR |
| **2. Property & Invariant** | Serialization, DTOs, boundaries | **Fast-Check** | Edge-case crashes, unhandled fuzzed payloads | Every commit / PR |
| **3. Mutation** | Assertion quality & test resilience | **StrykerJS** | False-positive tests with shallow assertions | Weekly / Pre-release |
| **4. Ephemeral Integration** | Real DB queries, queues, cache | **Testcontainers** | ORM query mismatches, Redis key timeouts | CI Pipeline |
| **5. Contract Verification** | Inter-service RMQ events & RPCs | **Pact** | Breaking payload schema changes across services | Multi-repo CI |
| **6. Realtime Concurrency** | Socket.IO connection & Ack latency | **Artillery** | Gateway event-loop lag, Redis pub/sub bottlenecks | Staging / Pre-deploy |
| **7. Chaos & Resilience** | Network drops, broker downtime | **Toxiproxy** | Broken reconnect loops, zombie sockets, dropped ACKs | Staging / Pre-deploy |

---

## Layer Implementation Blueprints

### Layer 4: Ephemeral Integration Testing (Testcontainers)

Run real MongoDB, Redis, and RabbitMQ Docker containers programmatically during Jest integration runs:

```bash
npm install -D @testcontainers/mongodb @testcontainers/redis testcontainers
```

```typescript
// test/integration/setup-containers.ts
import { MongoDBContainer } from '@testcontainers/mongodb';
import { GenericContainer } from 'testcontainers';

export async function setupTestInfra() {
  const mongoContainer = await new MongoDBContainer('mongo:6.0').start();
  const redisContainer = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .start();

  process.env.USER_SERVICE_MONGO_URI = mongoContainer.getConnectionString();
  process.env.REDIS_URL = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;

  return {
    teardown: async () => {
      await mongoContainer.stop();
      await redisContainer.stop();
    },
  };
}
```

---

### Layer 5: Asynchronous Contract Testing (Pact)

Ensure RabbitMQ event producers (`user-service`) and consumers (`gateway`, `notification-service`) never drift:

```bash
npm install -D @pact-foundation/pact
```

```typescript
// test/contracts/user-created.contract.spec.ts
import { MatchersV3, MessageConsumerPact } from '@pact-foundation/pact';

const { uuid, string } = MatchersV3;

const pact = new MessageConsumerPact({
  consumer: 'gateway',
  provider: 'user-service',
  dir: './pacts',
});

describe('User Created Event Contract', () => {
  it('should process user.created event with matching schema', async () => {
    await pact
      .expectsToReceive('a user.created message')
      .withContent({
        userId: uuid('550e8400-e29b-41d4-a716-446655440000'),
        name: string('John Doe'),
      })
      .verify(async (message) => {
        expect(message.contents.userId).toBeDefined();
        expect(message.contents.name).toBeDefined();
      });
  });
});
```

---

### Layer 6: Realtime WebSocket Load Testing (Artillery)

Simulate 5,000+ concurrent Socket.IO clients invoking RPCs (`emitWithAck`) and receiving live broadcasts:

```bash
npm install -D artillery artillery-engine-socketio-v3
```

Create `artillery-socketio.yml`:

```yaml
config:
  target: "http://localhost:3000/users"
  engines:
    socketio-v3: {}
  phases:
    - duration: 60
      arrivalRate: 20
      rampTo: 100 # Ramps to 100 new connections/sec
  processor: "./artillery-auth.js"

scenarios:
  - name: "Authenticated User Realtime Session"
    engine: socketio-v3
    flow:
      - emit:
          channel: "user:get_profile"
          data: {}
          response:
            channel: "user:get_profile"
            match:
              json: "$.success"
              value: true
      - think: 2
      - emit:
          channel: "user:update"
          data:
            name: "Updated Name"
```

Run test:
```bash
npx artillery run artillery-socketio.yml
```

---

### Layer 7: Network Chaos & Resilience (Toxiproxy)

Test Socket.IO and RabbitMQ automatic reconnection under network degradation:

```typescript
import { Toxiproxy } from 'toxiproxy-node-client';

const toxiproxy = new Toxiproxy('http://localhost:8474');

describe('Socket.IO Reconnection Resilience', () => {
  it('should queue messages and reconnect seamlessly after 3s network blackout', async () => {
    const proxy = await toxiproxy.getOrCreateProxy({
      name: 'redis_proxy',
      listen: 'localhost:16379',
      upstream: 'localhost:6379',
    });

    // Inject 3-second network cutoff
    await proxy.addToxic({
      name: 'cut_connection',
      type: 'limit_data',
      stream: 'downstream',
      toxicity: 1.0,
      attributes: { bytes: 0 },
    });

    // Verify socket client enters reconnecting state and flushes pending RPCs upon restore
    await proxy.removeToxic('cut_connection');
  });
});
```

---

## When to Use

- **Starting a new microservice / gateway**: Choose the appropriate test layer based on risk profile (Layer 1 & 2 mandatory, Layer 4 for DB, Layer 5 for message queues).
- **Preparing for high-traffic launch**: Execute Layer 6 (Artillery) to detect connection bottlenecks and memory leaks before production deployment.
- **Microservice cross-team collaboration**: Implement Layer 5 (Pact) to eliminate integration surprises between producer and consumer services.
- **Investigating production disconnects**: Run Layer 7 (Toxiproxy) to replicate intermittent network drops locally.
