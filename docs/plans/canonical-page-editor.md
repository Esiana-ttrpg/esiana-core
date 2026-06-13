# Canonical Page Editor

**Status:** P0–P2 + appearance widgets **shipped**; P3 expansion **won't-do** (see [deferred-backlog.md](../deferred-backlog.md))  
**Changelog:** [changelog.md](../../changelog.md) — Canonical page editor (v0.9 stabilization)  
**Tracking:** [deferred-backlog.md](../deferred-backlog.md) — Canonical page editor (won't-do P3 items)  
**Related:** [entity-inspector-ux.md](./entity-inspector-ux.md), [knowledge-architecture.md](./knowledge-architecture.md)

## North star

**One mental model:** users edit the page. Blocks are the editor. The rail inspects.

| Surface | Role |
|---------|------|
| **Page composition** | Canonical narrative + structured data (semantic blocks) |
| **Codex rail** | Read-mostly intelligence: continuity, links, discovery summary |
| **Edit mode** | Single DM control: inline block editing + layout drag handles |

## Canonical rules

- **Edit the page** → block/section widget → writes `WikiPage.metadata` and/or block `content`.
- **Inspect the entity** → Codex rail → diagnostics and navigation; deep links focus blocks (`?focusBlock=entity-hero&field=profession`).
- Metadata is **not duplicated** in block `content` when a projection already owns the field (hero, infobox).
- Layout upgrades are **opt-in** (`applyCharacterEditorialLayout`) — never silent.
- **Access** lives in Codex Document section (edit-only), not the page header. Discovery remains available to DMs from Codex.

## Taxonomy

Work is classified into three buckets — not all “deferred” items are equal:

| Bucket | Definition | Examples |
|--------|------------|----------|
| **Foundational** | Editor architecture; without it the canonical editor feels fragile | `useBlockDraft`, editorial expand/reflow, `BlockAction` registry, mobile focus authoring |
| **Feature expansion** | Valuable v2 systems that need stable authoring first | Lore semantic blocks, rich discovery states, appearance forms/details |
| **Speculative / parked** | Polish or user-driven migration; no schedule until proven need | Codex toolbar summary chip, legacy hair/eyes field migration |

Priority tiers **P0–P3** schedule delivery. See [todo.md](../../todo.md).

## Semantic blocks (character pilot)

| Block type | Label | Backing |
|------------|-------|---------|
| `entity-hero` | Character Overview | `WikiPage.metadata` character identity |
| `text-biography` | Biography | block `content.markdown` |
| `entity-relationships` | Relationships | metadata + relationship projection |
| `entity-timeline` | Timeline | character lineage metadata |
| `entity-appearance` | Appearance | metadata appearance projection |
| `entity-discovery` | Discovery | lore claims / party knowledge |
| `wiki-infobox` | Details | infobox projection |

Generic blocks (`text-tiptap`, `image-display`, `stat-block`, `wiki-backlinks`) remain for power users.

## Page subviews

Overview | Lore | Appearance | Relationships | Timeline | Discovery | Continuity — filter visible blocks; same grid engine and edit affordances.

## Workspace density

`WorkspaceMode`: Focused | Balanced | Expanded | Immersive (persisted per page).  
Per-block `preferredMeasure`: `readable` (prose) vs `workspace` (operational).  
Saved block `w`/`h` are never auto-shrunk for readability.

## Block draft state

Semantic widgets use `useBlockDraft` (`frontend/src/hooks/useBlockDraft.ts`) — local state while editing; commit on blur/debounce or explicit Apply; `markCommitted` after successful API persist.

**Unified draft flush** (hybrid: blur autosave + page Save for still-dirty / failed blocks) ships after `useBlockDraft` — coordinated flush, not atomic page save.

## Priority tiers

Metadata convention: `priority:p0` … `priority:p3` on [todo.md](../../todo.md) items.

### P0 — Stabilization (`priority:p0`, `ui-only`, `target:v0.9`)

| Work item | Rationale |
|-----------|-----------|
| Wire `useBlockDraft` | Grid stability, focus isolation, prevents metadata overwrite during keystrokes |
| Editorial expand + measured reflow | Core authoring UX on `WikiEditorialSurface` (not RGL-only polish) |
| `blockCapabilities` + `BlockAction` registry | Central block chrome; capabilities + dispatch (renderer is composition shell) |
| Unified draft flush + dirty-state coordination | Hybrid Save: blur autosave + coordinated flush (not transactional) |
| Responsive editorial polish (P1) | Stacked toolbar, touch targets, viewport focus overlay — not a dedicated mobile subsystem |

**P0 acceptance criteria**

- Hero field edits do not call `onMetadataSaved` until blur/debounce; `dirty` blocks parent overwrite.
- Block expand on default edit path uses staged transition or CSS equivalent; `prefers-reduced-motion` respected.
- Expand/Focus/Delete/Visibility route through `blockCapabilities`; `jump_to_continuity` stub present for P1.
- Narrow viewport: editorial mode default, focus overlay entry, block toolbar without horizontal scroll.

### P1 — Editorial cohesion (`priority:p1`, `target:v0.9`)

| Work item | Notes |
|-----------|-------|
| Appearance subview hardening | Mobile read tabs, editor dirty lifecycle, reader typography |
| Block-scoped continuity | Populate `ContinuityIssue.blockId`; per-block wikilink scan; Codex jump-to-block |
| Inline relationship linking | Entity pills, `[[` / slash suggestions, backlink preview (character blocks + biography TipTap) |
| Reader mode polish | Typography rhythm, pacing, collapsible sections, anchor links |
| Semantic block save/error status UX | Per-block Saving / Saved / Retry / Failed / Unsaved affordances |
| Semantic index hooks | `semanticIndexText`, `semanticKeywords`, `semanticReferences` per block adapter |

### P2 — Narrative intelligence (`priority:p2`, post-stabilization)

Prerequisites: P0 complete + appearance/layout confidence.

| Work item | Defer rationale |
|-----------|-----------------|
| Lore semantic blocks | Sources, interpretations, contradictory canon — high complexity |
| Rich discovery states | Rumor, partial, contested, timeline-gated — narrative epistemology, not visibility |
| Page narrative status | Active, Dead, Rumored, etc. — distinct from `ContentPresenceState`; `schema-sensitive` |
| Codex diagnostics expansion | Toolbar chip, discovery-aware rail variants |

**Continuity warnings v1** (temporal contradictions) remains the separate pre-1.0 gate in todo Layer 4 — orthogonal to block-scoped link scanning.

### P3 — Expansion + parked (`priority:p3`, [deferred-backlog.md](../deferred-backlog.md))

| Work item | Bucket |
|-----------|--------|
| Appearance forms/details widgets | **Shipped** — see changelog |
| Full appearance for Location + Organization | Feature expansion |
| `appearanceMode: 'section'` for Family/Object | Feature expansion |
| Block split + capability gating beyond character pilot | Feature expansion |
| Codex toolbar summary chip (`Codex • N issues`) | Speculative polish |
| Legacy field migration (hair/eyes → tags/summary) | Speculative — user-driven only |
| Discovery-aware appearance variants | Feature expansion — after `entity-appearance` proven |

### Appearance data ownership (baseline + overlays)

| Layer | Scope | Player label |
|-------|-------|--------------|
| **Entity-level** | Persistent identity truths | (shell) — `summary`, `appearanceTags`, gender, presentation, pronouns |
| **Forms-level** | Contextual presentation overlays (stored in `appearance.gallery`) | **Forms** — variant label, portrait, tags, `presentationType`, `presentationNotes`, `timelinePin` |
| **Details-level** | Baseline observable characterization — defaults, not absolutes | **Details** — build, voice, distinguishing features, injuries, clothing motifs, vibe, at-a-glance |

Forms represent distinct presentation states (transformations, disguises, era variants). Localized shifts in voice, vibe, clothing motifs, or demeanor belong in a Form's `presentationNotes` — not as nested structured descriptor schemas per form.

Form entries use `presentationType` (`default`, `transformation`, `disguise`, `historical`, `ceremonial`, `public`, `private`, `corrupted`) for structured semantics; freeform tags remain mood/aesthetic only. `isPrimary` is optional and not schema-enforced as singular — projection resolves via `resolvePrimaryGalleryEntry()`; P3 editor uses radio UX on save.

**Disguise vs transformation:** Forms may represent disguises or concealed identities. Transformation = same identity, altered presentation. Disguise = intentionally misleading presentation. Identity masking and viewer-specific shell resolution (summary, appearanceTags, name) are **projection concerns** — not appearance metadata concerns. Do not add disguise-masking fields to `appearance.gallery`.

**Non-goals (P3 guardrails):** per-form structured descriptor overrides; forms as mini-entities with full descriptor duplication; `hiddenName` / `secretIdentity` fields in appearance metadata; equipment slots, paper dolls, outfit inventory, native VFX pipelines.

## New subsystems (design)

### BlockAction registry

`frontend/src/lib/blockCapabilities.ts` — per `blockType`:

- Capabilities: which actions apply (expand, focus, reveal, duplicate, convert, open references, jump to continuity, pin to overview).
- `executeBlockAction` dispatch + descriptors consumed by `CodexBlockChrome`; `useBlockActions` in `WikiPageRenderer`.

### Semantic index hooks

Per-block adapters export:

```ts
semanticIndexText?: string;
semanticKeywords?: string[];
semanticReferences?: string[]; // page ids or labels
```

Used by Codex search, graph queries, continuity, and future AI assistance. Normalize in P1 before consumers multiply.

### Page narrative status (P2)

Editorial layer separate from discovery/presence: Active, Missing, Dead, Archived, Rumored, Retired, Historical, Legendary, Secret. Affects search, references, graph rendering — schema design before implementation.

**Shipped (P2):**

- Storage: `PageNarrativeStatus` sidecar on `WikiPage` with Prisma enum `PageNarrativeStatusType` (default `ACTIVE`).
- Shared contract: [`shared/pageNarrativeStatus.ts`](../../shared/pageNarrativeStatus.ts) — `projectPageNarrativeStatus`, character metadata fallback, `status:dead` search token.
- API: `GET/PATCH /wiki/:pageId/narrative-status`, batch `GET /wiki/narrative-status?ids=`.
- GM edit: Codex Provenance rail section; character identity status dual-writes substrate.
- UI: `NarrativeStatusBadge` on page header, identity strip, browse tiles; wikilink CSS modifiers; graph relationship chip hints; category refine facet + campaign search haystack.
- `SECRET` is GM-only in projection; lexically distinct from discovery `rumor` chip ("Canon: Rumored").

## Template Studio

Campaign and system admin studios share `getWikiWidgetOptions()` and `WikiPageRenderer`. Editorial CHARACTER presets ship in Phase 2b.

## Migration

- `?openInspector=1` → `?openCodex=1` (alias retained)
- `?focusField=` → `?focusBlock=&field=`
- CHARACTER pages: optional one-click editorial layout suggestion

## Implementation sequence

1. `blockCapabilities` scaffold
2. `useBlockDraft` — hero, lineage, appearance, codex metadata editors
3. Editorial expand transitions on `WikiEditorialSurface`
4. Mobile focus authoring
5. Block-scoped continuity + `jump_to_continuity`
6. Inline relationship UX + semantic index stubs (parallelizable with 2–4)
