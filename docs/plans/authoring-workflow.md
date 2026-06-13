# Authoring workflow — contextual overlays

**Status:** Tier 1–2 **shipped** (2026-06); additional scaffolds + projection chrome open in [todo.md](../../todo.md)  
**Changelog:** [changelog.md](../../changelog.md) — Layer 5 authoring workflow  
**Layer:** 5 — Narrative Workspace  
**Related:** [narrative-engine-layers.md](./narrative-engine-layers.md), [canonical-page-editor.md](./canonical-page-editor.md)

## Guiding principle

> **Authoring workflow features are contextual overlays on top of the universal editor, not intrinsic properties of all documents.**

This prevents Layer 5 creative workflow from becoming global app behavior and preserves the freeform wiki/worldbuilding feel.

## Canon vs drafts

> **Canon is curated. Drafts are lived-in.**

| | Canon | Workshop drafts |
|---|-------|-----------------|
| Discovery | Codex, Story, Journals, trees | Workshop recents, contextual entry |
| Lifecycle | Persistent structure | Persist indefinitely; formalize deliberately |
| Storage | Wiki tree | Draft state (`isDraft: true`), hidden from navigation |

Workshop drafts are **never** placed in Journals or visible Codex categories. Workshop owns drafts.

## Two-tier model

### Tier 1 — Lightweight global instrumentation

Attach broadly to Tiptap surfaces via shared editor infrastructure (`createWikiEditor`, `useEditorInstrumentation`). Low noise, infrastructural.

| Capability | Where |
|------------|-------|
| Word delta (session) | Optional editor status strip; Workshop ambient corner |
| Session duration | Client timer while focused |
| Entity link counts | Session instrumentation |
| Optional break reminders | User preference (localStorage) |
| Session flush | `CampaignActivity` on blur/save |

**Tone:** *"The editor understands your workflow"* — not performance dashboards.

**Non-goals:** narrative progress bars, templates, growth metrics on every page.

### Tier 2 — Structured authoring (contextual only)

Never default on wiki pages.

| Capability | Primary surface |
|------------|-----------------|
| Draft writing | **Progression › Workshop** |
| Campaign growth metrics | Progression › Insights |
| Narrative scaffolds | Progression › Insights (creates Workshop drafts) |
| Scene inline authoring | Progression › Scenes › Outline |
| Formalize draft → canon | Workshop › Formalize |

Entered via **Open in Workshop**, **Draft continuation**, **Progression › Scenes** (structured scene edit), or scaffold starters in Insights.

## WorkshopDocument

UI/API contract (`shared/workshopDocument.ts`). Phase 1 backs drafts with hidden wiki pages in `_Workshop Drafts` infrastructure folder — not user-facing IA.

- Autosave updates draft title/body only — no parent, template, or taxonomy.
- **Formalize** establishes **canonical identity**, not complete structure — publish/promote, not data entry.

### Formalize lifecycle

```
Workshop draft (loose prose) → minimal canonical shell → living entity enriched in Codex later
```

**Targets:** Character, Quest, Thread, Scene, Lore note.

**Required at formalize:** name/title, optional summary. Placement is auto-resolved (World › Characters for characters, quest/thread/scene roots) except lore notes (pick a World lore folder only).

**Explicitly not at formalize:** appearance matrices, relationship graphs, stat blocks, inventories, thread/quest wizards, multi-step flows.

**Never:** formalize into Journals (diegetic documents are a separate deliberate act).

## Authoring context

UI/session concept (`shared/authoringContext.ts`), not a canonical content type.

- **Default wiki edit:** `{ kind: 'freeform' }` — Tier 1 only.
- **Workshop:** `section=workshop` with optional `draft`, `anchors`, `authoringKind`.
- Contextual links create or resume **linked drafts** — never open canonical pages for editing in Workshop.

## Naming

| UI label | Meaning | Route |
|----------|---------|-------|
| Narrative scaffolds | Genre starters → Workshop drafts | Progression › Insights |
| Workshop | Private draft writing | Progression › Workshop |
| Formalize | Draft → canon promotion | Workshop overflow |

## Anti-patterns

- Implicit canonical page creation on Workshop autosave
- Workshop drafts in Journals or visible "Drafts" category
- Formalization wizards or required metadata at promote time
- `buildCharacterEditorialBlocks` / full encyclopedia layout on formalize
- Aggressive `[DRAFT]` labeling in Workshop UI
- Narrative progress in `WikiEditorToolbar` on every `text-tiptap` block
- Growth metrics in Workshop (belongs in Insights)
- Giant AI copilot in Workshop
- Auto-deletion of drafts

## Code map

| Area | Path |
|------|------|
| Document contract | `shared/workshopDocument.ts` |
| Formalize helpers | `shared/workshopFormalize.ts` |
| Formalize shells | `backend/src/lib/workshopFormalizeShells.ts` |
| Context types | `shared/authoringContext.ts` |
| Draft API | `backend/src/controllers/workshopDraftController.ts` |
| Draft service | `backend/src/lib/workshopDraftService.ts` |
| Workshop UI | `frontend/src/components/workshop/` |
| Editor factory | `frontend/src/components/wiki/createWikiEditor.ts` |
| Instrumentation | `frontend/src/hooks/useEditorInstrumentation.ts` |
| Growth metrics API | `backend/src/controllers/authoringController.ts` |
