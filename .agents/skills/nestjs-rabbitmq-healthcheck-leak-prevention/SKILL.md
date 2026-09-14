---
name: nestjs-rabbitmq-healthcheck-leak-prevention
description: "Use when configuring @nestjs/terminus health checks for RabbitMQ, troubleshooting ghost queue leaks in broker Mnesia, or preventing container OOM crashes caused by probe reply queues."
tier: local
target-stacks: ["nestjs", "rabbitmq", "typescript"]
metadata:
  origin: auto-extracted
---

# NestJS Terminus RabbitMQ Healthcheck Ghost Queue Leak Prevention

**Extracted:** 2026-09-14  
**Context:** When using `@nestjs/terminus` with `MicroserviceHealthIndicator.pingCheck` for RabbitMQ in containerized environments with periodic HTTP liveness/readiness probes (e.g. Docker `HEALTHCHECK`, Kubernetes probes).

## Problem
When configuring RabbitMQ health checks via `@nestjs/terminus`, omitting `queueOptions` causes NestJS `ClientRMQ` to dynamically declare an anonymous reply queue (`amq.gen-XXXXX`) on the broker using default properties:
- `durable: true`
- `autoDelete: false`
- `exclusive: false`

Because healthcheck probes typically run every 10–30 seconds:
1. Every health check creates a persistent anonymous queue that is **never deleted** when the probe connection closes.
2. In production with a 10s interval, ~8,640 ghost queues leak per day (~30,000 in 3.5 days).
3. The accumulation overwhelms Erlang Mnesia (`rabbit_durable_queue.DCD` log dump overload), consumes container memory up to the limit (1GiB / 100%), and triggers the Linux kernel OOM Killer (`exit code 137`), crashing the broker and blocking microservice startup (`ECONNREFUSED 5672`).

## Solution

### 1. Explicitly Configure Ephemeral Queue Options in HealthController
In the health controller, explicitly set `queueOptions` to `durable: false` and `autoDelete: true`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, MicroserviceHealthIndicator } from '@nestjs/terminus';
import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private rmq: MicroserviceHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL');
    return this.health.check([
      () =>
        this.rmq.pingCheck('rabbitmq', {
          transport: Transport.RMQ,
          options: {
            urls: [rabbitmqUrl],
            queueOptions: {
              durable: false,     // Never persist health probe queues to disk
              autoDelete: true,  // Immediately purge queue once connection drops
            },
          },
        }),
    ]);
  }
}
```

### 2. Enforce Ephemeral Queue Settings in Unit Tests
Add a dedicated test case asserting that `queueOptions` has `durable: false` and `autoDelete: true` to prevent future regressions:

```typescript
it('should enforce durable: false and autoDelete: true to prevent RabbitMQ ghost queue leak', async () => {
  await controller.check();

  const rmqCall = rmqIndicator.pingCheck.mock.calls[0];
  const rmqOptions = rmqCall[1].options;
  expect(rmqOptions.queueOptions).toBeDefined();
  expect(rmqOptions.queueOptions.durable).toBe(false);
  expect(rmqOptions.queueOptions.autoDelete).toBe(true);
});
```

## When to Use
- When implementing or reviewing `@nestjs/terminus` health checks for RabbitMQ.
- When RabbitMQ memory usage steadily increases over time despite low message traffic.
- When `rabbitmqctl list_queues` shows thousands of `amq.gen-*` queues remaining in the broker.
- When container logs show Erlang Mnesia write overload warnings (`{dump_log,write_threshold}`) or OOM SIGKILL terminations.
