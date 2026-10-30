# Chronology workspace

Chronology is one historical workspace with four representations:

| View | Purpose | Local controls |
| --- | --- | --- |
| Calendar | What happened on a particular native date? | Calendar, month, day agenda, importance |
| Timeline | How did events unfold and overlap? | Tracks, reference clock, comparison/native mode, pan, zoom, filters |
| Eras | How is history organized into meaningful periods? | Calendar, period selection, historical overview, defining events |
| Campaign Feed | Which recorded developments tell the campaign's story? | Sources, historical window, importance, future inclusion, grouping |

The compact header contains navigation, the active clock's Campaign Today, historical
browsing context, and shared actions. Today always comes from campaign time tracking.
Configured Current eras and eras containing today retain their distinct labels.

## Navigation and inspection

Calendar day agendas link to Timeline. Event details in every view link to Calendar,
Timeline, and Campaign Feed. Timeline era links open the selected Eras overview;
Eras can focus or compare its period on Timeline. Authoritative occurrence era IDs
provide era links. Feed source links continue to open authorized canonical session,
downtime, entity, or Wiki records.

Links preserve unrelated query parameters, including explicit empty Feed filters.
`view`, `track`, and `era` retain their existing meanings. An occurrence link adds
`event` (base ID), `occurrence` (recurrence index), and `at` (exact start minute in the
source clock's coordinate system). Day links use `date=year:monthIndex:day` with a
zero-based native month index. `focus` identifies an explicit destination request;
ordinary tab returns restore the view's mounted session. Event inspection also supplies
the selected occurrence to compatible header tabs. Links push browser history; storing
a resolved Feed window uses replacement so it does not add a second navigation step.

Destinations match the entire occurrence identity against authorized loaded data.
They never match titles, use array positions, fall back to the first recurrence, or
treat URL identifiers as authorization. Refresh and browser Back/Forward resolve the
same target. Missing, unauthorized, stale, and out-of-coverage targets show a neutral
unavailable message. No target title is recovered from URL data.

Multi-day occurrences open their real native start, even if only continuation rows
were loaded. The inspector retains their full duration and inclusive native end date.
Calculations use half-open intervals and bigint minutes, including signed and partial-day
offsets. Conversion uses the existing calendar engine and alignment eligibility.
Unaligned clocks retain native dates; they are never placed on the comparison axis or
used to invent a reference-clock Feed window. Unsupported year-one conversions remain
unavailable. Usable native definitions do not require a supported alignment mapping.

Inspection uses the shared right overlay on desktop and dismissible bottom sheet on
mobile. Opening it reserves no canvas width. Native dates, recurrence context, source
calendar, importance, categories, description, Lore links, and permitted editing actions
use shared detail content. Supported reference dates are supplementary. Editing retains
the shared dialog and dirty-form protections. Escape dismisses inspection, focus returns
to the invoking control (or active view navigation after a deep link), and mobile sheets
respect safe areas. Selection is reconciled against refreshed authorized data.

## State and filters

Mounted workspace sessions retain Calendar's calendar/month/day/importance, Timeline's
tracks/order/reference/mode/filters/viewports, and Eras' calendar/period/importance.
Feed filters, grouping, future inclusion, and its historical window remain URL-backed.
Campaign changes remount the workspace, discarding campaign-scoped state and selection.
Timeline is mounted only when active, so cross-view requests never move a hidden canvas.
An explicit valid destination takes precedence over mounted state, then view defaults.

Importance remains independent: Calendar and Timeline start with Major and Minor,
Eras with Major, and Feed with all three levels. Explicit empty filter selections remain
empty. Filtered Calendar and Timeline targets explain the exclusion and offer
**Show this event**, temporarily revealing only that occurrence without changing filters.
Feed retains its source, importance, session, and future filters when opening a target's
historical window; **Show this event** explicitly opens authorized occurrence details.

## Coverage and limits

The existing timeline endpoint supplies a bounded campaign-wide occurrence bundle;
it reports a query window without guaranteeing complete coverage of that window.
Exact navigation resolves within that authorized bundle. A Feed event outside the loaded
occurrence inventory can therefore be unavailable for cross-view inspection even while
its projected Feed entry and canonical source links remain readable.

Shared occurrence notices retain separate recurrence, per-event, total-cap, invalid
condition, missing prerequisite, and window warnings. Feed retains its separate source
inventory, truncation, incomplete-history, native-only, and undated warnings. Empty
regions describe loaded matches, not proof that no history exists. Different authoritative
records remain distinct even when their titles and dates match.

The obsolete event ledger has no callers and is removed. Shared detail, inspection,
and editing components remain in use; this workspace adds no data model, API, global
store, browser framework, or visualization dependency.

## Verification

`chronologyNavigation.test.ts` exercises exact identity, malformed/stale/deleted targets,
continuation reconstruction, huge negative and partial-day offsets, leap/intercalary
dates, year-one bounds, and unsupported mappings. Existing temporal suites remain in use.
`frontend/scripts/verify-chronology-ui.mjs` covers all four views, the actual page owner,
round trips, refresh and browser history, retained viewports, explicit reveal without
filter changes, unauthorized targets, read-only/mobile inspection, focus, editing guards,
calendar sizing, and Timeline gestures. Its existing optional browser tooling is unchanged.
