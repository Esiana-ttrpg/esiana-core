# Terminology

User-facing language vs engineering identifiers. Pre-1.0 convergence: update **user-facing** copy aggressively; keep **engineering** IDs stable (Tier C).

Related: [design-philosophy.md](../design-philosophy.md), [docs/architecture-internal/campaign-access-model.md](./platform/campaign-access-model.md).

## Engineering ↔ user-facing

| Engineering | User-facing | Surfaces |
|-------------|-------------|----------|
| `dashboard` route / section | **Campaign Home** | Sidebar, page titles, breadcrumbs, docs |
| `dashboardConfig` API field | Campaign Home layout config | User docs only |
| `focused` workspace mode | **Reading** | Codex mode picker |
| `expanded` workspace mode | **Writing** | Codex mode picker |
| `balanced` / wide measure | **Layout: Wide** | Codex layout picker |
| `immersive` workspace mode | Focus overlay toggle | Not top-level picker |
| `narrativeThreads` / wiki title | **Threads** | Sidebar nav label |
| `GAMEMASTER` role | **Game Master** | Settings, roster (GM/DM OK in context) |
| `WRITER` role | **Writer** | Settings, roster (not Co-DM in UI) |
| `PARTICIPANT` role | **Player** | Settings, roster |
| `OBSERVER` role | **Observer** | Settings, roster |
| `GM_ONLY` visibility | GM only | Keep in UI where established |
| Session notes routes | **Session Notes** | Nav, headings, empty states |

## Concept distinctions

| Concept | Term | Meaning |
|---------|------|---------|
| Raw session recap | **Session Notes** | Practical table utility; per-session authoring |
| Canonical evolving history | **Chronicle** | Future product layer — not session recaps |
| Temporal continuity | **Chronology** | In-world time, timelines, calendars |
| Unresolved arcs | **Threads** | Ongoing narrative, connective continuity |

Do not use Chronicle for session note surfaces.

## Do not overreach

- **Steward** — rejected for GM UI; aspirational tone only in design philosophy
- **Chronicle Hub** — rejected for Campaign Home; too archival
- Self-consciously literary labels on settings, session lists, or roster screens
- Replacing GM/DM/Player with abstract euphemisms

When evocative language obscures usability, prefer TTRPG-clear terms.

## Navigation IA

- **Default campaign entry:** codex/wiki root
- **Secondary overview:** Campaign Home (`/dashboard` internally)
- Sidebar order: codex categories before Campaign Home
