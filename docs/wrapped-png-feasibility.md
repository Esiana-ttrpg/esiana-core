# Wrapped PNG export feasibility (Pass 2 spike)

Pass 3 requires client-side 1080×1920 PNG export. This note records the
technical go/no-go checks before depending on a renderer.

## Candidate

`html-to-image` (DOM → canvas → PNG). No external screenshot service.

## Risk checklist

| Risk | Mitigation |
| --- | --- |
| Cross-origin campaign artwork taints canvas | Export tree must **never load restricted or cross-origin art**. Use themed CSS fallbacks only on the share-safe surface. |
| Web fonts not ready | Wait for `document.fonts.ready` before capture; prefer theme fonts already loaded on the page. |
| Mobile Safari memory / height limits | Capture a dedicated offscreen 1080×1920 node (not a scaled live slide). Keep DOM shallow. |
| Chromium vs Safari filter/CSS differences | Visual regression: compare Adventurer preset on one Chromium and one Safari path before release. |

## Required manual verification before Pass 3 lands

1. Chromium desktop: capture allowlisted final card with gradient fallback (no remote image).
2. Mobile Safari (or Safari iOS simulator): same card exports a valid PNG without blank/tainted canvas.
3. Confirm share-safe DOM contains no `<img src>` pointing at campaign storage URLs.

## Decision

**Go** for `html-to-image` **if** export uses share-safe allowlist fields and themed fallbacks only.
**No-go** if product requires arbitrary campaign hero images inside the PNG without a same-origin proxy.

Pass 3 implements export against this constraint.
