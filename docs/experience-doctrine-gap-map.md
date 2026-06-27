# Experience doctrine — doc gap map

Maps existing maintainer docs to [experience-doctrine.md](./experience-doctrine.md) — what each covers, what overlaps, and what gaps remain.

Last updated: 2026-06-22 (initial doctrine pass).

---

## Layer model

```text
philosophy.md / design-philosophy.md     Identity essay (why Esiana feels literary)
        ↓
experience-doctrine.md                  Decision rules (what to build)  ← NEW
        ↓
density-doctrine.md                     Enforceable limits (how much)
surface-hierarchy.md + design-tokens.md Implementation (how it looks)
deprecated-ui-patterns.md               Pattern blocklist (what not to add)
design-philosophy-checklist.md          PR gate (merge checklist)
```

---

## Doc-by-doc mapping

| Document | Strength | Overlap with doctrine | Gap / redundancy |
|----------|----------|----------------------|------------------|
| [philosophy.md](../philosophy.md) | Product identity, anti-goals | Campaign-state-first aligns with §What Esiana is | Not operational; no gravity test |
| [design-philosophy.md](../design-philosophy.md) | Reader-first, calmness, typography-over-borders | Principles 3, 7, 14 echo essay sections | Essay format; "not a dashboard" without state-object rule |
| [density-doctrine.md](./density-doctrine.md) | Panel counts, measure, ultrawide | Principles 5, 11, 13; typography measure | Limits without *where attention settles* |
| [surface-hierarchy.md](./surface-hierarchy.md) | Focal/contextual/recessed tokens | Gravity levers, principle 2 implementation | Tokens without perceptual outcome stated |
| [design-tokens.md](./design-tokens.md) | CSS vars, ThemeStack, composition stances | Tempo, typographic vars | Engineering reference; not a decision doc |
| [deprecated-ui-patterns.md](./deprecated-ui-patterns.md) | #1–#14 visual anti-patterns | Principles 7, 8, 10; equal-weight symptoms | Missing IA smells until #15–#20 added |
| [design-philosophy-checklist.md](./design-philosophy-checklist.md) | PR merge gate | Surface hierarchy, accent discipline | No gravity test or doctrine principle cite |
| [terminology.md](./terminology.md) | User-facing copy | Principle 9 copy clarity | No layout/gravity content |
| [viewport-audit.md](./viewport-audit.md) | Mobile UX findings | Priority collapse | Route-specific; not doctrine |
| [entity-inspector-ux.md](./plans/entity-inspector-ux.md) | Rail inspect model | Principle 13 | Terminology drift (Focused/Balanced modes) |
| [future-shells.md](../frontend/src/lib/entityPageShells/future-shells.md) | Per-entity shell intent | State object + representation per entity | Aspirational; org overview still violates doctrine |

---

## Doctrine topics → where they live

| Doctrine topic | Primary doc | Supporting docs |
|----------------|-------------|-----------------|
| Campaign-state-first | **experience-doctrine.md** §What Esiana is | philosophy.md, design-philosophy.md |
| Gravity test | **experience-doctrine.md** §Gravity test | surface-hierarchy.md (implementation) |
| 15 principles | **experience-doctrine.md** | density-doctrine, deprecated-ui-patterns |
| Typographic roles | **experience-doctrine.md** §Typographic roles | design-tokens.md, surfaceLayout.ts |
| Representation types | **experience-doctrine.md** §Representation types | workspaceOrchestration.ts, sceneComposition.ts |
| Action placement | **experience-doctrine.md** §Action placement | terminology.md, canonical-page-editor.md |
| Signature interaction | **experience-doctrine.md** §Signature interaction | Campaign Home widgets, fog/revelation product docs |
| Route scorecard | **audits/experience-scorecard.md** | viewport-audit.md |
| Convergence backlog | **audits/experience-convergence-backlog.md** | GitHub issues/milestones |
| IA anti-patterns #15–#20 | **deprecated-ui-patterns.md** | experience-doctrine.md principle 12 |

---

## Redundancies to avoid duplicating

| Do not repeat in new UI docs | Already canonical in |
|------------------------------|---------------------|
| Widget cap ≤10, panel limits | density-doctrine.md |
| `SURFACE_*_CLASS` definitions | surface-hierarchy.md, surfaceLayout.ts |
| Reading / Writing mode names | terminology.md |
| Full ThemeStack channel authority | design-tokens.md |
| Emotional identity essay | design-philosophy.md |

**Single source for "where does attention settle?":** experience-doctrine.md only.

---

## Remaining gaps (post-doctrine)

| Gap | Priority | Suggested owner |
|-----|----------|-----------------|
| Accessibility (WCAG, focus, contrast) | High | New `docs/accessibility.md` or DEVELOPMENT.md expansion |
| Motion spec (durations beyond 180ms) | Medium | design-tokens.md section |
| Plugin UI aesthetic constraints | Medium | docs/plugin-development/ |
| Light foundation parity | Medium | surface-hierarchy.md + scorecard re-run |
| Automated doctrine lint (TYPE_*, uppercase) | Low | CI script |
| User-facing "how Esiana feels" | Low | docs wiki (operator audience) |

---

## Cross-links to add when editing other docs

- `design-philosophy.md` — link to experience-doctrine.md at top for decision rules
- `AGENTS.md` — reference experience-doctrine.md in Frontend section
- `frontend/DEVELOPMENT.md` — pointer to typographic roles + gravity test
