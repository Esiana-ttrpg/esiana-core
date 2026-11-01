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

## Session widgets

Session Schedule defaults to standard presentation and supports compact and
featured variants. Its date block shows the scheduled month, day, and local time
in the session's recorded timezone. Title, session number, countdown, venue, and
authorized location context link into the existing session workflow. Published
sessions whose recorded start/end range contains now are shown as ongoing;
passing a start time alone never implies completion. Completed, cancelled, and
skipped states do not offer RSVP controls. The existing manager scheduling and
skip dialogs remain available. Players use the authorized dashboard summary;
manager schedule refreshes retain recorded venue details.

Last Session prioritizes the current member's note contribution. Empty author
placeholders are not contributions. The primary link uses the existing own-note
workflow with `notes=mine&edit=1`; the editor only honors this intent when the
loaded note belongs to the signed-in account. Dashboard reads never create
notes or infer contributions from attendance.

Contributors are visible authors with readable, non-empty note bodies. Page and
block revelation, page visibility, and campaign capability overrides constrain
these summaries. Private or unrevealed own notes are marked unavailable rather
than missing. Private authors and hidden character identities do not enter
contribution counts or labels. Session-note retrieval uses the existing portable
Prisma JSON-path helper to load the selected group, excluding deleted pages.

Recording and transcript summaries use the existing recording access policy.
Disabled campaign or instance audio omits the media section entirely. Readable
recordings with ready media link into the existing recording panel; known missing
media placeholders are not reported as playable. Transcript states distinguish
unavailable, not requested, queued, processing, ready, and requiring attention.
Readers see published transcripts; transcript editors can also open drafts.
Job failures are summarized only for users allowed to inspect processing jobs.
No provider credentials, failure details, private recording counts, or raw media
URLs enter the dashboard response.

The selected recording and transcript tab are addressed through the existing
session all-notes route using `recording` and `audioTab` query parameters. These
links retain the session and recording access checks. Returning focus to Campaign
Home refreshes the existing bundle's session summary and preserves layout edits;
widgets do not add transcription polling. Session widget placement remains under
the existing customization controls.

## Quick Links resources

Quick Links stores one ordered `config.links` list. Legacy internal destination
strings remain valid; external entries additionally store `kind: 'external'`, a
stable ID, display label, HTTP/HTTPS URL, and optional built-in icon. Internal and
external entries share the existing seven-link limit and widget persistence.
An explicitly empty list stays empty.

Authorized layout editors can add, edit, reorder, and remove resources. Server
payload validation rejects unsafe schemes, credentials, malformed URLs, duplicate
external IDs, invalid icons, and excess entries. Read normalization keeps safe
legacy entries without making damaged URLs clickable. External navigation uses
`target="_blank"` and `rel="noopener noreferrer"`, with a small external-link
indicator and an accessible new-tab label. The server never fetches these URLs.
No VTT or Discord links are inserted automatically.

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

The additional session/resource regressions cover mixed-link save/refresh
compatibility, URL validation, editor reordering/removal, direct own-note entry,
capability overrides, hidden contributions, disabled audio, private recordings,
and published versus draft transcript access. The existing disposable SQLite
audio suite also exercises dashboard follow-up against real completed-session
and note records, including campaign isolation. It does not use developer data.

Validated using Node 26.12.1 and pnpm 9.15.9: 718 frontend Node tests, 72 frontend
Vitest tests, 41 targeted backend tests, and 87 audio/API/SQLite tests pass. The
production build passes with the existing mixed static/dynamic import warnings.
The new session widgets and Quick Links editor were also visually reviewed with
compiled light/dark theme styles and fixture data.
