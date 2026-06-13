# Domain events

**Author guide:** [docs/plugin-development/events.md](../../../docs/plugin-development/events.md)

---

The domain event bus (`dispatchDomainEvent`) provides **observational** fan-out after core mutations.

## Guarantees

- Events are **immutable snapshots** (DTOs only — no Prisma delegates or raw wiki block payloads).
- Dispatch is **non-blocking** (`setImmediate`).
- Core types use `core:` prefix; plugins emit `{pluginId}:` prefixed types only.

## Non-guarantees

Plugins must **not** assume:

- Transactional coupling to the originating mutation
- Delivery ordering across event types
- Retry or at-least-once delivery
- Persistent event log or replay

Treat events as notifications for sync, logging, or side effects — not as a source of truth.

## Development

In development, payloads may be frozen (`Object.freeze`) to catch accidental mutation.
