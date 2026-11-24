# Yearly Wrapped — release verification checklist

Use with [yearly-wrapped.md](./yearly-wrapped.md). Automated coverage lives in
`shared/wrapped/*`, `backend/src/lib/stats/wrapped/*`, and
`frontend/src/components/wrapped/*` / `frontend/src/lib/wrapped*`.

## Personas

- [ ] Empty / new user → Wrapped unavailable (no fabricated cards)
- [ ] Writing-only → short or full edition without session slides
- [ ] Session-only → adventure-log eligible; writing slides omitted when unavailable
- [ ] Multi-campaign → top-campaign uses active-campaign ranking
- [ ] Private campaign owner → in-app ok; export has no campaign titles/art
- [ ] Lost access after snapshot → top campaign re-picked or cleared; aggregates not leaked

## Coverage & editions

- [ ] 2026 shows partial writing coverage disclosure
- [ ] Preview vs completed labeled from local TZ year bounds
- [ ] Short (3–7) and full (8–15) tiers both usable
- [ ] Fellow Adventurers omitted without completed-session attendance

## Interaction & a11y

- [ ] Keyboard ←/→/Space, progress dots, Escape/close
- [ ] Touch swipe on mobile
- [ ] `prefers-reduced-motion` and pause control
- [ ] Screen-reader labels on carousel region and tabs

## Export

- [ ] Adventurer / Worldbuilder / Storyteller presets
- [ ] PNG is 1080×1920
- [ ] Share works where `navigator.share` supports files; else download
- [ ] Export DOM has no `<img>` / no campaign cover URLs
- [ ] Allowlisted fields only

## Discovery

- [ ] Seasonal banner Dec 15–Jan 15 (local TZ)
- [ ] `wrapped-invite:YYYY` dismiss persists across Dec→Jan
- [ ] Creative Statistics archive lists eligible years only
