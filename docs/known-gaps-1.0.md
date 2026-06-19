# Known documentation gaps (1.0)

Items intentionally **not** addressed in the pre-1.0 docs audit pass (2026-06). Use this ledger to avoid re-litigating scope during the v1.0.0 tag.

---

## Documented but thin / future passes

| Topic | Status | Where detail lives today |
|-------|--------|--------------------------|
| Full capability policy matrix for GMs | Thin | [`architecture-internal/campaign-access-model.md`](./architecture-internal/campaign-access-model.md) |
| Narrative diagnostics L4 (continuity warnings, orphan analysis, dead-end detection) | No operator guide | `architecture-internal/narrative-*.md` |
| Downtime ledger, havens, projects | No public feature guide | `architecture-internal/downtime-*.md` |
| Scheduled effects configuration | Internal only | `architecture-internal/scheduled-effects.md` |
| SCIM, admin account merge, proxy header auth | Deferred | [Federated identity](../../docs/options/federated-identity.md) |
| `docs/plans/` archive (57 files) | Historical snapshots | Not end-user docs; optional superseded banners only |
| Plugin capability-matrix “pre-1.0 gaps” section | May need post-1.0 refresh | [`plugins/capability-matrix.md`](./plugins/capability-matrix.md) |
| Adventure / Investigation topology | Threads hub documented; investigation matrix thin | `architecture-internal/narrative-investigation-ledger.md` |
| Campaign History / narrative snapshots | Internal user guide only | `architecture-internal/narrative-snapshots-user-guide.md` |
| Unified REST search | Not in core v1.0 | [API overview](../../docs/api/overview.md) |

---

## Product gaps (not documentation gaps)

These are **won't-do** or **plugin-only** per [`deferred-backlog.md`](./deferred-backlog.md):

- Tokenized share-link public wiki/campaign surfaces
- OneNote / Google Docs core import (plugin-only)
- WebSockets / SSE live push
- Real-time VTT tactical tooling in core

---

## Accuracy items resolved in this pass

For audit trail, these stale items were fixed in the public wiki:

- Removed `allowCampaignPluginManifestLink` (dropped from schema)
- Campaign Home / Chronology naming (no Dashboard / Chronicle canvas in feature docs)
- OIDC documented as core — not `openid-connect` community plugin
- `mapPreserveFullRes` Admin default documented as `true`
- New thin pages: discovery, threads, world advance, federated identity

---

## Suggested post-1.0 doc work (optional)

1. Operator guide for downtime / economic ledger when those surfaces stabilize for self-hosters
2. GM guide for L4 narrative diagnostics (or scope as plugin-only tooling docs)
3. Public capability matrix excerpt from `campaign-access-model.md`
4. Annotate `docs/plans/` headers with “superseded as of v0.9.0” where useful

---

## Related

- [Pre-1.0 RC checklist](./release/pre-1.0-rc-checklist.md)
- [Deferred backlog](./deferred-backlog.md)
