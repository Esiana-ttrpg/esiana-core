# Campaign Home widgets

Campaign Home uses the existing `react-grid-layout` legacy adapter and campaign
dashboard JSON. The banner remains outside the widget grid. No database migration
or new dependency is required.

The default composition has five widgets: a compact campaign state summary,
featured Current Story, Party, Recent Activity, and Living Threads. Story occupies
seven of twelve desktop columns; supporting content occupies five. Below 900px,
widgets stack in saved reading order. An unchanged default layout with no visible
story, characters, activity, session, or calendar date shows the story starting
state alone. Creation navigation is restricted to campaign managers. This does
not change the saved configuration or create campaign records.

## Presentation and persistence

`shared/dashboardPresentation.ts` declares categories, descriptions, supported
compact/standard/featured variants, preferred spans, minimum dimensions, and
content requirements. `DashboardWidgetShell` owns common chrome and state
presentation. Presentation does not fetch or authorize data.

New placements fit content using `ResizeObserver`. Four rendering rows preserve
the exact pixel height and position of each original 88px row, including its 16px
gap. Finer rendering rows reduce unused space to less than 26px per widget.
Saved positions and manual heights support quarter-row increments. Existing
integer coordinates retain their original pixel dimensions; legacy placements
without `autoHeight` retain manual heights.

Normalization preserves enabled choices, positions, settings, personal scope,
custom text, and plugin placement IDs. Existing legacy ID aliases still resolve
to their canonical widgets. Newly discovered widgets are appended disabled.
An explicitly empty widget array remains empty. Earlier automatic activation of
briefing widgets has been removed; a normal read never resets a customization.

Customization retains automatic saving. Fit content controls automatic height;
turn it off for manual height resizing. Narrow screens use explicit movement
buttons without overwriting saved desktop geometry during normal viewing. Reset
requires confirmation and replaces widget choices while preserving the banner.

Plugin `LayoutWidget` registrations may optionally provide `presentation` hints.
Existing registrations and their minimum dimensions remain valid; automatic
height is opt-in for extensions. Registration remains independent of campaign
permissions and plugin API access.

## Content and authorization

The dashboard bundle remains the primary data source. Snapshot date and session
information reuse the shared summary. Entity/event/faction feed settings trigger
one bundle refresh after a successful save; geometry changes do not refetch feeds.
World Snapshot uses authorized location and era context rather than edit metrics.
Campaign Pulse reports edit activity and session timing separately from world
chronology. Recent Activity is explicitly record history.

Arc prose is filtered by campaign and page visibility before selection. Party
portraits and counts use only visible active characters, with eight returned
previews and six displayed previews. Current Story uses existing prose and quest
progress, avoids duplicate quest titles, and links directly to the active record.
Upcoming sessions require a visible undeleted page. Last Session requires an
explicit `COMPLETED` schedule; future, unscheduled, draft, and skipped placeholders
cannot become a recap fallback.

Quest and thread widgets use bounded previews with links to complete records.
Other bank widgets retain their data integrations and settings within the shared
shell. Calendar and chronometer retain custom calendar support. Description and
Text retain their existing content formatting.

## Verification and limits

Regression coverage includes server/client normalization parity, legacy layouts,
plugin IDs, presentation persistence, empty layouts, fine row positions, hidden
arcs and party members, role-sensitive session queries, story progress, large
parties, and shared loading/error presentation.

Local browser review uses actual dashboard components with fixture data: light
and dark themes; desktop, tablet, and mobile; blank, sparse, and mature campaigns;
missing portraits; and player versus manager starting actions. It exercises hide,
restore, presentation selection, dragging, resizing, reset, and browser refresh.
Fixture API responses do not replace live campaign authorization testing.

Florence's live campaign and a custom-calendar browser fixture are not available
in this workspace review. These still need a maintainer smoke check against the
running application. There is no configured lint script in the root, frontend,
or backend packages; TypeScript, frontend tests, relevant backend tests, and the
production build are the available repository checks.

Verified with Node 26.12.1 and pnpm 9.15.9: 714 frontend Node tests, 53 frontend
Vitest tests, 44 dashboard/affected backend tests, and the production build pass.
Vite reports existing mixed static/dynamic import warnings.
