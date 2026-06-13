# Campaign Seeder (legacy)

> **Superseded by core Sample Data (Phase 1).** The deterministic plan-then-execute engine now lives in `esiana-core/backend/src/lib/sampleData/`. This plugin remains for backward compatibility during migration.

## Status

- **Engine** — moved to core; enable with `ENABLE_SAMPLE_DATA=true`
- **Scenario JSON presets** — frozen; converted to markdown in `demo-content-packs` (tomb + player experience). West Marches stays Sample Data.
- **Generator presets in wizard** — retired; legacy `presetId` values shim to `demo-content-packs` or Sample Data for one release
- **CLI** — use `npm run seed-campaign` from `esiana-core` (core script)

See `esiana-core/docs/architecture-internal/sample-data-generator.md`.

**Not for production** — dev/staging only.
