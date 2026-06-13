# Narrative foundation sign-off (L1–L4)

**Signed:** 2026-06-13 (verification pass — no new features)

Layers 1–4 narrative foundation is **shipped** per [todo.md](../../todo.md) and [changelog.md](../../changelog.md). This document confirms pillar coherence before v1.0.0.

## Pillar verification

| Pillar | Status | Evidence |
|--------|--------|----------|
| Knowledge / fog / revelation | Shipped | [map-presence-visibility.md](../plans/map-presence-visibility.md), `shared/mapPresence.ts`, lore tables |
| Discovery | Shipped | Discovery codex v1, hub banners, `discoveryProjectionService` |
| Historical aliases | Shipped | `EntityHistoricalAlias`, entity lore editors |
| Lore citations | Shipped | `LoreClaim` + sources, entity lore editors |
| Continuity warnings v1 | Shipped | [continuity-warnings.md](../architecture-internal/continuity-warnings.md), structural batch diagnostics |
| Narrative threads | Shipped | Threads hub, lifecycle rebuild on restore |
| Since-last-visit | Shipped | [temporal-snapshots.md](../architecture-internal/temporal-snapshots.md), region snapshot API |
| Atlas / maps | Core shipped | Temporal projection, fog, Visual Atlas v1; polish deferred (clustering, cached manifests) |

## Export coherence (Phase 1 audit)

Lore claims + historical aliases now round-trip in sovereign ZIP — [pre-1.0-export-audit.md](./pre-1.0-export-audit.md).

## Known non-gates (deferred)

- Layer 6 intelligence (session prep, pacing analytics)
- Map marker clustering, cached Visual Atlas manifests
- Multi-calendar temporal mapping (`schema-sensitive`, in todo)
- ACL drift: `discovery.reveal` vs `canManage` proxy — track in capability migration audit

## Doc drift fixes

- [.cursor/rules/esiana-roadmap.mdc](../../.cursor/rules/esiana-roadmap.mdc) updated — fog/atlas no longer listed as open gates
- [data-backup-and-export.md](../../../docs/features/data-backup-and-export.md) aligned with sovereign `knowledge.json`

Reader-facing summary: [docs/architecture/narrative-foundation.md](../../../docs/architecture/narrative-foundation.md)

## Sign-off criteria met

- Every L1–L4 pillar has shipped code + changelog entry
- No open `gate:pre-1.0` narrative items remain (infra/docs gates separate)
- Export audit documents B/C tier gaps explicitly
