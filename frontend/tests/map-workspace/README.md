# Map workspace browser fixture

Run Vite with `pnpm --filter @esiana/frontend dev`, then run
`node scripts/verify-map-workspace.mjs` from the repository root.

The script intercepts all API requests with synthetic campaign data. It exercises
the actual map viewer through its normal providers without modifying a campaign.
Screenshots are written to the ignored `artifacts/map-workspace/` directory.
Use `MAP_TEST_URL` for another Vite origin and `MAP_TEST_BROWSER` for an installed
Playwright browser channel (Windows defaults to Edge).

Coverage includes shared map instance and drawing drafts across presentation
changes, circle/path/text creation, pin placement cancellation, property discard
guards and save failures, focus containment, explicit empty layer selection,
per-map defaults, permission loss, and desktop/mobile control positioning.

Geometry, wire serialization, and visibility contract tests also run in the
frontend test suite. Real backend authorization remains covered separately by
the backend map-presence and visibility tests.
