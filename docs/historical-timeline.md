# Historical Timeline

Chronology's Timeline is a visual historical workspace with selectable clock tracks,
calendar-aware date ticks, era regions, duration bars, milestones, and dense-event
clusters. The campaign master clock is selected initially. Existing `track` and `era`
links can open another authorized clock or focus an era.

## Comparison and native inspection

The existing FantasyCalendar model defines `epochOffset` in minutes from the campaign
master epoch. Valid configured calendars therefore share a supported absolute time
reference, even when their month structures, year lengths, or epoch offsets differ.
The selected reference clock supplies the shared axis labels. Changing the reference
preserves the absolute visible range. Each track displays its own native date context.

Shared coordinates retain signed bigint epoch minutes until viewport-relative SVG
conversion. Partial-day offsets are preserved. Occurrences normalize from native date
parts, continuation offsets, and duration before projection; repeated legacy epoch
values do not determine recurrence positions. Half-open occurrence boundaries preserve
base event, recurrence index, and representative occurrence identity.

Calendars without a supported mapping are explicitly unaligned and cannot appear on
the shared axis. They can be inspected on their native axis when their native definition
is usable. Missing or invalid definitions display an unavailable state. No manual
synchronization or additional relationship model is provided. Dates before a calendar's
supported year-one boundary display an unavailable label rather than a fabricated date.

Any selected usable clock can be inspected independently. One viewport is retained for
shared comparison and one for each native view, while the workspace remains mounted.
Native inspection does not draw cross-clock comparison guides.

## Eras workspace

Eras browses historical periods one calendar at a time. The campaign master is the
default; authorized `track` and `era` links select another calendar or period. Without
an explicit era, selection prefers the configured Current era, then one containing
the calendar's current date, then the first era in configured display order. Invalid
explicit links show an unavailable state rather than silently choosing another era.

The era's canonical Wiki overview is its primary content. The existing era dialog
edits that same Wiki-backed content; Open Wiki overview is available when the page
is in the authorized Wiki inventory. No additional narrative document is stored.
Management retains existing capabilities, visibility defaults, impact review, and
non-destructive deletion snapshots. Move up/down changes display order only.

Desktop navigation is collapsible; mobile uses a compact selector. Native boundaries
remain authoritative. Unspecified boundaries are independent of configured Current
status and date containment. Exact inclusive durations appear only when both dates
are usable. The context strip reuses Timeline geometry: proportional periods,
overlapping rows, gaps, open-end arrows, selected highlighting, and actual date labels.

Selected major events starts with Major enabled; Minor and Notice are optional.
Up to five occurrences sample the entire loaded matching history deterministically:
sort chronologically with stable identity ties, then choose indices
`round(i * (n - 1) / 4)` for `i = 0..4` when more than five match. Continuation rows
are deduplicated while separate repetitions retain their identities. Interval overlap
includes events beginning before or continuing beyond the era. This is a sample of
loaded history, never a completeness claim; coverage and expansion warnings remain
visible. Event selection uses the shared inspector and event editor.

View on Timeline and View all on Timeline focus the selected calendar and era.
Compare on Timeline is available for reliably aligned secondary clocks and shows the
native clock alongside the campaign master reference. Equivalent master dates are
supporting context; unavailable conversions never fabricate dates.

While Chronology remains mounted, it retains a small Timeline session snapshot:
tracks, reference/native mode, filters, era visibility, stable selection, and viewports.
Geometry, caches, gestures, and transient UI remain inside Timeline. Normal tab returns
restore the saved viewport; explicit era actions, including repeated requests for the
same era, override it while retaining unrelated comparison settings. Campaign changes
reset the snapshot, and authorization changes reconcile it against the loaded inventory.

## Tracks and interactions

Tracks opens a collapsible desktop sidebar or a compact mobile overlay. It provides
visibility toggles, move-up/down controls, Show All, per-clock Hide Others, independent
inspection, and Reset View. Each track can be collapsed without losing its selected
event. Track selection, order, collapse, filters, and native viewports are in-memory
state; no preferences are persisted. Reset restores the master-only default and clears
stored viewports. Hiding the reference falls back to a selected master clock, then the
first selected aligned clock, without moving the shared viewport.

Major and Minor events are enabled initially; Notices can be enabled in Navigation &
filters. All categories are initially selected. Filters apply consistently to all tracks
and preserve the viewport. Fit to Loaded Events includes filtered occurrences in all
selected aligned tracks, including collapsed tracks; native inspection fits its clock.
Today and date/era navigation use the active axis.

Drag horizontally, use horizontal trackpad scrolling or Shift+wheel, or use the zoom
controls. Ctrl/Cmd+wheel zooms around the pointer. Touch supports horizontal panning and
two-finger pinch zoom while retaining vertical scrolling. With the canvas focused,
arrow keys pan and plus/minus zoom. The shared axis stays visible while tracks scroll.

Each track packs independently into at most twelve event lanes. When overlaps exceed
that budget, eleven lanes contain individual events and the final lane contains
clusters, with Major events prioritized. Cluster choosers retain complete membership in
stable importance/date/identity order. Labels and enlarged hit targets participate in
packing. Offscreen intervals are culled, and vertically offscreen event canvases retain
their height while deferring lane rendering. Unchanged per-clock data reuses normalized
intervals; opening inspection does not repack lanes.

The reference clock's eras provide background context across aligned tracks. Additional
clocks have their own era strips. Overlapping labels occupy separate rows, gaps remain
gaps, and open boundaries remain open. This does not change era management or ordering.

Selecting an event marks its interval across aligned tracks and emphasizes intersecting
occurrences. Single-day occurrences use a vertical date marker. Unrelated events remain
visible, and cluster labels report simultaneous member counts. Selection opens the shared
desktop inspector overlay or mobile bottom sheet, preserving the viewport. Details show
the source clock, native duration/dates, and reliably converted reference dates. Lore Page
actions, permissions, the shared editor, and mobile full-screen editing remain authoritative.
Selection survives collapse/reordering and mode switches; hiding its track, filtering it
out, deletion, or authorization removal clears it.

## Data coverage and authorization

The existing campaign-scoped endpoint returns a campaign-wide bounded occurrence bundle.
Tracks are restricted to that authorized inventory and joined to time-tracking definitions.
Events and eras derive only from authorized responses; the frontend adds no authorization
model. No per-event requests or additional historical queries are issued when navigating.

The endpoint reports a requested window but does not enforce it during generation.
Loaded history therefore never implies complete coverage, even when no cap is reported.
A visible workspace notice retains expansion warnings; track notices identify capped
base-event IDs where attributable and always retain the loaded-history qualification.
Empty regions mean no loaded matching events, not definitive absence of history.

## Validation

Run the frontend suite, production build (including TypeScript), i18n validation, and
relevant chronology occurrence, era, and time-engine suites. Focused helper coverage is
in `historicalTimeline.test.ts`. The existing optional
`frontend/scripts/verify-chronology-ui.mjs` browser harness exercises Calendar and Timeline
inspection/editing, clusters, multi-clock reference changes, independent viewport
restoration, track order/collapse/reset, authorization inventory, and mobile sheets and
touch navigation. It uses existing optional browser tooling; no new application browser,
database, or visualization dependency is introduced.
