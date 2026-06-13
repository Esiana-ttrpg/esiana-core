# Capacity baselines

Reference JSON reports from `npm run profile-capacity` on a known stack.

| File | Stack | Profile |
|------|-------|---------|
| `medium-postgres-4gb.template.json` | Template — replace with measured values | `benchmark-medium` |

Capture workflow:

1. `ENABLE_SAMPLE_DATA=true` — seed `benchmark-medium` on a clean Compose instance.
2. `npm run profile-capacity -- --token … --slug … --output docs/capacity/baselines/medium-postgres-4gb.json`
3. Commit JSON + generated `.md` sibling when hot paths change materially.

Reports omit machine-specific fields (`baseUrl`, `hostname`). `campaignSnapshot` records tier entity counts (pages, characters, locations, organizations, sessions, maps) — not asset or word metrics.

Percentile metrics (p50/p95/p99) are reserved for a future schema version.
