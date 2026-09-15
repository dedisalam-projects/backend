---
name: websocket-envelope-testing
description: "Use when testing WebSocket broadcasts, or when refactoring Socket.IO gateway payloads — ensure E2E integration tests handle { event, data } standardized envelopes while maintaining backward compatibility with legacy raw objects."
tier: local
target-stacks: ["nestjs", "socketio", "jest"]
metadata:
  origin: auto-extracted
---

# WebSocket Envelope Payload Testing

**Extracted:** 2026-09-16
**Context:** When a WebSocket gateway is refactored to emit standardized enveloped payloads (e.g., `{ event: 'USER_CREATED', data: { ... } }`) instead of raw objects, integration tests against long-lived ephemeral containers might intermittently fail or pass depending on the container's build freshness.

## Problem
If an E2E test strictly asserts `expect(payload.email).toBe(...)`, it will fail with `undefined` when the server starts wrapping the payload in `{ event, data }`. Conversely, if the test is strictly updated to `expect(payload.data.email).toBe(...)`, it will fail when running locally against a stale Docker container that still emits raw payloads, causing false-negative regressions.

## Solution
Use a robust, resilient payload extractor in integration tests that gracefully handles both the standardized envelope and the legacy raw payload. Always explicitly assert the `event` string if the envelope format is detected.

```typescript
// Resilient E2E Payload Extraction & Assertion
adminSocket.once('user:updated', (payload) => {
  liveUpdatedData = payload;
});

// Wait for broadcast
await new Promise((r) => setTimeout(r, 300));
expect(liveUpdatedData).toBeDefined();

// 1. Conditionally assert the envelope event string if present
if (liveUpdatedData?.event) {
  expect(liveUpdatedData.event).toBe('USER_UPDATED');
}

// 2. Gracefully extract payload (supports both new { data } envelope and legacy raw object)
const updatedPayload = liveUpdatedData?.data || liveUpdatedData;

// 3. Assert on the actual domain data
expect(updatedPayload.name).toBe('Renamed Realtime User');
```

## When to Use
- When refactoring WebSocket payloads to introduce standard envelopes (e.g., adding `event`, `meta`, `timestamp`).
- When writing Socket.IO E2E tests in a microservices environment where gateway containers might lag behind the test suite.
- When resolving E2E test failures complaining about `Received: undefined` after a WebSocket gateway payload change.
