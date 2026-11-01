# Campaign statistics

Campaign Statistics is a separate campaign view, linked from the optional
Campaign Home widget. It describes authorized records, rather than estimating
how much a group has played or how much its world has changed.

## Source audit and metric definitions

| Metric | Authoritative source | Interpretation |
| --- | --- | --- |
| Completed sessions | Explicit `COMPLETED` session schedules linked to readable, undeleted pages | Counted by recorded scheduled start, not completion time; undated completions have no period |
| Recorded attending responses | `ATTENDING` responses on those completed sessions | Responses, not proof of attendance |
| Page edits and creations | User-source `PAGE_EDITED` and `PAGE_CREATED` narrative events on currently readable pages | Counts of recorded operations; excludes system-source events |
| Visible pages | Current authorized wiki pages | Current state, without historical comparison |
| Active quests / open threads | Canonical quest/thread metadata on authorized pages | Current state, without historical comparison |
| Real-world campaign age | Campaign creation timestamp | Elapsed real-world days, separate from chronology |
| Major / Minor / Notice | Authorized calendar event records with canonical epoch minutes | In-world snapshot up to the current world minute; recurring occurrences are not inferred |

Activity periods are rolling 7, 30, 90, or 365 real-world days. Comparisons use
the immediately preceding equal interval. Values distinguish measured amounts,
measured zero, and unavailable data; comparisons use absolute changes and never
divide by zero. The response includes the exact interval boundaries and
calculation timestamp. Current-state metrics explicitly have no historical
comparison.

Played duration is unavailable: a scheduled range is not measured play time.
Dated note contributions are unavailable: author placeholders and subsequent
edits cannot establish an original contribution date. Historical quest
completion, faction/development changes, and campaign-origin elapsed world time
need reliable historical contracts before they become metrics. These omissions
are explicit rather than invented from current state. This contract leaves room
for future yearly summaries without promising historical data that was never
recorded.

Calendar dates remain in the campaign's canonical world-minute domain. They
are never converted to Gregorian activity dates. Custom date records without an
epoch value make chronology totals unavailable. Chronology reads use at most
10,001 event headers; more than 10,000 records also produces unavailable totals,
rather than a misleading partial count.

## Authorization and cost

`GET /campaigns/:campaignHandle/campaign-statistics?days=30` uses campaign
capabilities, page visibility, revelation, temporal availability, and event
presence. Hidden/deleted/foreign pages cannot enter aggregates. The statistics
widget uses the existing dashboard bundle only when enabled and eligible.

Period counts use database aggregates over bounded date ranges. A bounded
five-minute, per-viewer/capability cache avoids repeating those aggregates.
Current page authorization and bounded calendar headers are checked before a
cache hit; a visibility or revelation change cannot retain restricted totals.
No session note bodies, revision histories, recording files, or provider data
are scanned for these metrics. No widget polling is added.

The audited legacy `/world-stats` endpoint previously used campaign-wide
counters, editor identities, and an inferred growth estimate. It now adapts the
authorized statistics service. Supported legacy fields remain available;
unsupported fields return unavailable and editor identities are omitted. The
old aggregate builder is not used by either statistics endpoint. Integrations
should move to the explained metric contract above.

## Review limits

Disposable SQLite/API tests cover private-page aggregate exclusion, changed
access after a cache fill, manager versus player results, zero versus missing
values, interval comparisons, invalid ranges, and the legacy endpoint adapter.
Production-sized campaign performance and live custom-calendar data still need
a maintainer smoke check. This view does not infer actual attendance, actual
played hours, or a campaign's historical world-state transitions.
