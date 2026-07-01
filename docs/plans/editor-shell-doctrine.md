# Editor Shell Doctrine

**Status:** Active product direction for wiki page editing  
**Related:** [canonical-page-editor.md](./canonical-page-editor.md)

## Experience goals

1. **One editor shell across all editable entities.**
2. **One obvious action hierarchy.**
3. **No UI that exposes internal implementation concepts.**
4. **Consistent shell; entity-specific content.**
5. **The editor should feel like editing a document, not configuring a workspace.**
6. **Page utilities belong in coherent categories—not a catch-all sidebar.**

---

## Editor Shell Doctrine

Every editable entity (Character, Quest, Event, Bestiary, Location, Organization, etc.) uses the **same editor shell**. The shell defines navigation, actions, and editing workflow. Individual entity types only customize the **contents of their Overview** and their **available subviews**.

### Shell vs content

Consistency applies to the **shell**, not the **document**. Overview is intentionally entity-specific. A Character Overview is metadata-first; a Quest Overview is narrative-first. Navigation and editing workflow remain identical.

### What Overview means

Overview is the primary workspace for an entity. It is **not** expected to have identical contents across entity types.

---

## Page utilities taxonomy

| Category | Purpose | Examples | UI home |
|----------|---------|----------|---------|
| **Page properties** | Define the page | Belongs with (intra-module), visibility, tags, aliases, Transform (cross-module) | Settings drawer |
| **Editorial tools** | Help the author | Continuity, links, diagnostics | **Continuity** and **Relationships** subview tabs |
| **Campaign runtime** | Live campaign state | Party knowledge, discovery | **Discovery** subview tab |

Do not mix all three in one undifferentiated panel.

### Mental models

- **Edit** — change the document (blocks, Add Widget, Arrange Blocks, Save)
- **Subview tabs** — relational, continuity, and discovery workspaces
- **Settings** — change page definition (visibility, belongs-with placement within a module, tags, Transform across modules)

**Belongs with** reorganizes a page within its current module only. **Transform** moves a page between modules (e.g. Character ↔ Bestiary, Thread ↔ Quest) with block and metadata migration. Legacy `templateType` is internal and not edited in Settings.

**Placement rule:** If UI can appear in a page section and a separate overlay without changing meaning, use one surface only. Subview tabs are canonical for system inference.

---

## Canonical header anatomy

```
Breadcrumbs

Title                                    Read bar
Entity type                              Search · Edit · More

Subview navigation

Edit bar (editing only)
Add Widget · Arrange Blocks · Save
```

### Action hierarchy

**Primary read bar:** Search · Edit · More

**Edit bar (when editing):** Add Widget · Arrange Blocks · Save (always visible; disabled when clean)

**Overflow (More):** Pin to home · Page settings · Delete page

### Implementation terminology

Never surface internal workspace modes (Focused workspace, Prose-first, Editorial editing, Block expanded, etc.) in user-facing copy. `WorkspaceMode` may remain an internal layout driver only.

---

## Shell registration

- Dedicated shells: `character`, `bestiary`, `ancestry`, `organization` in [`entityPageShells/registry.ts`](../frontend/src/lib/entityPageShells/registry.ts)
- Fallback: `genericWikiShell` for quest, thread, scene, default, and unmigrated types
- New entity types: register subviews and Overview content; do not invent new header layouts

---

## Long-term direction

The editor should visually resemble a **document**, not nested panels. Reduce heavy card nesting in favor of whitespace and section headings where possible.

**Follow-up:** Settings fields in Overview Metadata.
