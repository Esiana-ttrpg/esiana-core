# Campaign narrative feed

Campaign Feed reads existing records as a campaign history. It starts with newest
in-world developments first, grouped by campaign-master date. Major, Minor, and
Notice chronology events are enabled. Future records are excluded initially;
undated records and unsupported native-clock dates have separate collapsed sections.

## Authoritative sources and dating

- Chronology uses the same occurrence generator as Timeline. Feed mode consolidates
  daily continuation rows and preserves separate recurrence indices, occurrence IDs,
  duration, native dates, and epoch offsets. Undated events never inherit today.
- Sessions use their canonical anchor's fantasy epoch and an explicitly identified
  canonical summary/body block. Excerpts stop at a word boundary within 400 characters.
  Private blocks, author-note collections, transcripts, and schedules are excluded.
  Empty scheduled placeholders do not establish that a session happened.
- Faction relationships use recorded history and its effective in-world date, with
  both related pages and the record's visibility authorized before projection.
- World-advance effects require a durable application receipt. Distinct effects remain
  distinct records grouped by batch identity. The parent batch event is their common
  artifact/provenance, not an additional copy of the same history. Referenced pages
  must be authorized; unsupported nested effects are withheld from ordinary readers.
- Downtime periods retain their session-derived gap identities. Hidden sessions are
  never bridged into invented periods. Project completion/failure uses its recorded
  in-world completion timestamp and links to its authorized canonical page. Authored
  period labels reuse existing overlays; simulation internals and private annotations
  are excluded.
- Accepted progression outcomes already represented by chronology artifacts appear
  once as chronology records. Elevated viewers receive their accepted-source provenance.
  Acceptance wall-clock timestamps never become fictional dates.

Wiki content and existing source records remain canonical. Feed projection creates
no records, chronology events, summaries, or activity database.

## Windows and coverage

The initial window covers 30 campaign-master days through the end of today. Earlier
and Later request adjacent, non-overlapping half-open epoch ranges: start included,
end excluded. A calendar-aware range dialog accepts inclusive first/last days and
converts them to that request contract. Latest history restores the initial window.
Later stops at today unless Include future is enabled. Current-day date-only entries
remain eligible, while precise future instants remain excluded until explicitly enabled.

Source inventories are bounded to 2,000 candidates, with separate 100-record undated
and native-only sections. Session excerpts read at most 200 authorized anchors per
request. Chronology expands at most 100 recurrences per event. Source qualifications,
expansion warnings, requested range, and final response caps are preserved separately.
No absence or uncapped response establishes complete history.

Explicit epoch-dated chronology and native-year candidate queries use the requested
window before scanning. Final authorization, importance, temporal filtering, ordering,
and stable-identity consolidation precede the 2,000-entry dated response cap. Narrow
range halves the requested window when the final response is capped. Narrowing cannot
recover recurrences beyond expansion limits or canonical pages outside the bounded
source inventory. Those qualifications remain visible under coverage limitations.

Related batches and downtime records are presentation groups, not deduplication keys.
Only identical stable entry identities are deduplicated. Similar prose, dates, or titles
never establish that two records describe the same fact.

## Integration gaps

Accepted non-event progression outcomes and plugin-specific artifact visibility/dating
still require source adapters; the feed reports this gap rather than inferring entries
from suggestions or current artifact state. Current quest status and ordinary entity
edit timestamps are not historical transitions. Raw map keyframes and current
territorial overlays are not projected into the feed; authorized recorded applied
world-advance effects provide supported territorial, character, and location context.
Condition/plugin recurrence remains limited to the shared chronology generator.

## Interface and compatibility

Feed filter and navigation state uses existing Chronology query parameters. Links,
event inspection, and authorized event editing reuse shared surfaces. Snapshot
comparison/milestones and period editing are secondary dialogs; the reading stream has
one vertical scroll and mobile filters reflow without horizontal narrative scrolling.

`GET /chronology/overlay` opts into feed projection when `order`, `importance`, or
`includeFuture` is supplied. Calls omitting all three keep the existing convergence
path and response behavior. Feed metadata is additive to the existing wire contracts.
`importance=` selects no chronology levels; `domains=` selects no feed sources.

## Verification

Run frontend tests/build/i18n validation, backend TypeScript, the focused feed/convergence,
chronology, session, downtime, and progression tests, and the existing disposable
SQLite era harness (which also exercises real feed sources and legacy opt-out).
The existing chronology browser harness covers desktop/mobile feed navigation,
filters, grouping, coverage, source inspection, dialogs, permissions, and focus
restoration alongside Calendar, Timeline, and Eras regressions. Screenshots are local
verification artifacts under `node_modules/.chronology-verification/feed-*.png`.
