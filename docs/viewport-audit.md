# Viewport audit — Phase 3 mobile UX

**Date:** 2026-05-28  
**Scope:** Hub, campaign shell, wiki editor, session notes, admin  
**Breakpoints tested:** 375px, 768px, 1024px (code review + layout implementation)

## Summary

| Severity | Open (baseline) | After Phase 3 |
|----------|-----------------|---------------|
| P0 | 2 | 0 |
| P1 | 5 | 0 (fixed or mitigated) |
| P2 | 2 | deferred |

**Root causes addressed:** always-on campaign sidebar; missing admin mobile nav; wiki grid/toolbar density on narrow viewports.

## Findings

| ID | Area | Route | Viewport | Severity | Description | Root cause | Status |
|----|------|-------|----------|----------|-------------|------------|--------|
| V-01 | Sidebar | `/c/:slug/*` | 375 | P0 | Main column ~87px usable with fixed `w-72` sidebar | `CampaignLayout`, `Sidebar` | fixed |
| V-02 | Admin | `/admin/*` | &lt;768 | P0 | No nav between admin sections | `AdminLayout` | fixed |
| V-03 | Wiki | `/c/:slug/wiki/:id` | 375 | P1 | 3-col widget grid unreadable | `WikiPageRenderer` | fixed |
| V-04 | Wiki | wiki edit | 375 | P1 | Toolbar wraps into tall multi-row strip | `WikiEditorToolbar` | fixed |
| V-05 | Wiki | wiki page | 375 | P1 | Header icon cluster crowds title | `WikiPage` | fixed |
| V-06 | Notes | `/c/:slug/notes/:id` | 375 | P1 | Breadcrumbs overflow | `SessionNoteEditor` | fixed |
| V-07 | Hub | `/` | 375 | P2 | Minor header/button stacking | `GlobalHubPage` | fixed |
| V-08 | Admin | tables | 375 | P2 | Wide tables need horizontal scroll | intentional `overflow-x-auto` | acceptable |
| V-09 | Dashboard | `/c/:slug/dashboard` | 375 | P2 | `react-grid-layout` customize on phone | `DashboardGrid` | deferred |
| V-10 | Chronology | `/c/:slug/chronology` | 375 | P2 | Calendar/timeline density | chronology views | deferred |

## Acceptable patterns

- Admin and campaign settings tables inside `overflow-x-auto` wrappers (body does not scroll horizontally).

## Deferred (out of Phase 3 scope)

- Dashboard layout customize mode on phones
- Chronology canvas, recruitment lobby, template studio full pass

## Implementation notes (Phase 3)

- **Campaign nav:** `CampaignNavProvider` + off-canvas drawer below `lg`; menu button in `AppHeader`.
- **Admin nav:** `AdminNavProvider` + `AdminSidebarNav` drawer below `md`.
- **Wiki:** Stacked widget grid when viewport &lt;1024px in read mode; toolbar horizontal scroll; TipTap `overflow-x-auto`.
- **Session notes:** Wrapping breadcrumbs; full-width main via campaign drawer.
