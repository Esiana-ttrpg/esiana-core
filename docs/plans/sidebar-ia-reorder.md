# Sidebar IA reorder

**Status:** Shipped — 2026-06  
**Tracking:** [changelog.md](../../changelog.md) → Workflow polish — Sidebar IA  
**Related:** [todo.md](../../todo.md) → Sidebar layout polish (tabbed sidebar remains open)

## Target information architecture

Single top-to-bottom campaign nav:

1. Campaign identity band (name + last updated)
2. **Campaign Home** → **Party**
3. **PLAY** — Adventure (expandable submenu), Journals, Session Notes
4. **WORLD** — Characters, Organizations, Locations, Maps, Objects (hidden by default), Families, Bestiary, Ancestries
5. **TIMELINE** — Calendars, Timelines, Events (fixed links)
6. **TOOLS** — Rules/Resources, Tags, Page Templates (GM/Writer), Visual Atlas (hidden by default), Recent Changes, Settings

## Shipped scope

- Four-zone config model (`playOrder`, `worldLoreOrder`, `toolsOrder`) with migration from legacy `gameManagementOrder`
- Removed standalone Narrative zone; Threads + Unresolved moved under Adventure submenu
- `ADVENTURE_SIDEBAR_ITEMS` — Adventure Board, Threads, Investigation, Scenes, Continuity, Unresolved, Arcs, Sessions (Timeline tab remains hub-only)
- `AdventureNavGroup` expandable parent in `Sidebar.tsx`
- `SidebarSettingsTab` four-zone editors
- Campaign title band: removed decorative "Campaign" label; title wraps instead of truncating

## Out of scope / still open

- Optional tabbed sidebar ([todo.md](../../todo.md) — Sidebar layout polish)
- Quick Access + Relations planned stubs unchanged (hidden by default)
