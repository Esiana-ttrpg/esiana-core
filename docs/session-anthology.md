# Session snapshot formatter (Phase 2.5)

The **player session anthology** is implemented as a **Session Snapshot Formatter**: a pure Markdown export over the same payload as Phase 2.75 All View. There is no separate query path.

## Data source

```
GET /c/:slug/wiki/session-notes/combined?timelinePointId=:id
GET /c/:slug/wiki/session-notes/combined?sessionGroupId=:id
```

Primary key: **`sessionGroupId`**. Timeline routes resolve to that group automatically.

The response includes:

- `session` — title block metadata (fantasy date label, location, played date)
- `columns` — per-author notes (masked for players when DM-only)
- `entitiesMentioned` — deduped wiki targets
- `references` — aggregate backlinks/outlinks for the sidebar widget
- `referenceSourcePageIds` — visible author page IDs

## Snapshot document structure

1. **Title block** — `# {session.title}`, campaign name, in-world date (or “Unknown”), real-world played date, optional location
2. **Entities mentioned** — bullet list from `entitiesMentioned`
3. **Per-perspective sections** — one `## {displayName}` per author, in **chronological section order** (`fantasyEpochMinute`, then `createdAt`), **skipping empty and masked sections**

v1 does **not** interleave paragraphs across authors; each author has one section. Paragraph-level interleave would require dated note-entry chunks in metadata or schema.

## Visibility

| Viewer | DM-only author notes |
|--------|----------------------|
| DM / Co-DM | Included in export |
| Player | Omitted (columns are `masked` server-side; formatter uses `visibleColumns()` only) |

## Frontend components

| File | Role |
|------|------|
| [`frontend/src/hooks/useSessionCombined.ts`](../frontend/src/hooks/useSessionCombined.ts) | Single fetch for session UIs |
| [`frontend/src/lib/sessionSnapshotFormat.ts`](../frontend/src/lib/sessionSnapshotFormat.ts) | Pure Markdown formatter |
| [`frontend/src/components/session/SessionSnapshotExporter.tsx`](../frontend/src/components/session/SessionSnapshotExporter.tsx) | Preview, copy, download `.md` |
| [`frontend/src/pages/SessionCombinedNotesPage.tsx`](../frontend/src/pages/SessionCombinedNotesPage.tsx) | Grid + Snapshot tabs (one fetch) |

## References sidebar

Session notes use **aggregate references** from the combined payload. [`ReferencesWidget`](../frontend/src/components/wiki/widgets/ReferencesWidget.tsx) accepts `aggregateReferences` and does not issue per-page fetches in session context.

## Output channels (v1)

- In-app preview (All View → Snapshot tab)
- Copy to clipboard
- Download `.md`

Out of scope: PDF, print CSS, compile-hub sidebar link until product approves.

## Non-goals

- Changes to `compileSessionNotes` folder/notebook scopes
- Second API for anthology or references
- New footer entity list in the export (sidebar covers navigation)
