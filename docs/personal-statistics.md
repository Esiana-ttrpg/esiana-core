# Personal statistics

Personal Statistics is the owner-facing and public-profile view of a user's
creative work across authorized campaigns. It is a **projection** of campaign
activity records, not a separate measurement system.

This document freezes Esiana 1.10 PR 1: current metric IDs and formulas,
known inaccuracies, campaign activity coverage, timezone reuse, the proposed
migration, and review gates for later PRs. **No calculation in this PR
changes.** Compatibility endpoints stay:

- `GET /api/user/creator-attribution` (owner, includes habits)
- `GET /api/users/:id/creator-attribution` (public strip; public-campaign counts only)
- `GET /api/user/statistics?range=&from=&to=&campaignId=&version=1` (owner, versioned)

Related campaign-scoped contract: [campaign-statistics.md](./campaign-statistics.md).

## Compatibility

All 13 existing personal metric IDs and formulas remain as implemented in
`buildUserCreatorAttribution` and `buildRollupHabits`. Companion metrics may
be added later under new IDs. Do not silently redefine these IDs.

| Metric ID | UI label | Current formula | Kind | Known inaccuracy |
| --- | --- | --- | --- | --- |
| `attribution.totalWordsCreated` | Words written | `SUM(WikiPageStats.wordCount)` on undeleted pages where `createdByUserId = user` in current non-archived memberships | Current-state snapshot, creator-attributed | Later editors' words on those pages inflate the total. Words the user added on other people's pages do not count. |
| `attribution.pagesCreated` | Pages created | `COUNT` of the same created-page set | Current-state snapshot | Soft-deleted pages drop out. Includes `DEFAULT` and `SESSION_NOTE`. No visibility filter. |
| `attribution.totalEdits` | Edits | `COUNT(NarrativeEvent PAGE_EDITED)` by `actorUserId` in those campaigns | Historical lifetime | Creates do not count. Soft-deleted pages' historical edits still count. Owner-only. |
| `attribution.charactersCreated` | Characters | Created pages whose `resolveWikiCodexType({ templateType, metadata })` is `CHARACTER` | Current-state snapshot | Page `id` is not passed, so tree-based category resolution does not run. Retyping a page moves the count. |
| `attribution.locationsCreated` | Locations | Same set, `LOCATION` | Current-state snapshot | Same category-resolution limit. |
| `attribution.organizationsCreated` | Organizations | Same set, `ORGANIZATION` | Current-state snapshot | Same category-resolution limit. |
| `attribution.connectionsCreated` | Connections | `COUNT(NarrativeEvent LINK_CREATED)` by this actor | Historical lifetime | Uses events, not the live `WikiLink` table. |
| `attribution.campaignsContributedCount` | Tables contributed to | Distinct current non-archived membership campaign IDs that appear on created pages **or** any `NarrativeEvent` by this actor | Current membership ∩ historical activity | Membership alone does not count. Leaving a table drops it. **Public responses currently include private-campaign totals** (see Privacy). |
| `attribution.wordsAdded` | Words added (30 days) | `SUM(UserWritingDailyRollup.wordsAdded)` over UTC days in the last 30 days | Historical window | Positive net deltas only. Wiki save and writing-session flush can increment the same words twice. UTC buckets. Owner-only. |
| `attribution.writingStreak` | Writing streak | Consecutive UTC days backward from today with `editsCount > 0` or `wordsAdded > 0` or `sessionCount > 0`, lookback 120 days | Historical window | UTC, not the user's timezone. A focused session with no save still counts. Owner-only. |
| `attribution.writingCadence` | Weekly rhythm | `round((activeDays30 / 30) * 7, 1)` | Historical window | Denominator is always 30. Not a weekday histogram. Owner-only. |
| `attribution.substantialRevisions` | Deep rewrites (30 days) | `SUM(substantialRevisions)` over 30 UTC days | Historical window | Per-save increment, not unique pages. Threshold is 40% **net word-count** change (`revisionMetrics`). Same-length rewrites do not qualify. Owner-only. |
| `attribution.favoriteWritingHour` | Favorite writing time | UTC hour 0–23 with the most `sessionMinutes` among 30-day rows that have `peakHourUtc` | Historical estimate | Only writing-session flushes set hour/minutes; wiki saves do not. Stored UTC; UI converts with the browser timezone. Owner-only. |

When no `UserWritingDailyRollup` rows exist, the five habit metrics are
`unavailable` / `not_yet_tracked`. Favorite hour is `unavailable` /
`insufficient_data` when rollup rows exist but no session minutes were
recorded.

Worldbuilding mix (overview copy, not one of the 13) counts created pages
excluding `DEFAULT` and `SESSION_NOTE`, sorted by count.

## Editor activity map

There is **no wiki revision-history model**. Saves overwrite `WikiPage.blocks`.
Historical words added versus removed cannot be reconstructed.

| Surface | Persist path | Substrate / events | Daily rollup | Notes |
| --- | --- | --- | --- | --- |
| Wiki page body | Explicit save → `PATCH .../layout` | `syncWikiPageSubstrate` emits `PAGE_CREATED` / `PAGE_EDITED` / `LINK_CREATED` when `narrativeSource === 'user'` | Yes — net word delta | Last write wins. No optimistic lock. |
| Workshop draft | 800ms autosave | Substrate with `emitEvents: false` | No edit increment | Apply/formalize emits `PAGE_EDITED`. |
| Session note | Explicit save | Substrate; per-author `SESSION_NOTE` page | Yes | File upload creates a note without typing. |
| Journals workspace page | Explicit wiki save | Same as wiki | Yes | |
| Journal publication | Explicit save of `contentMarkdown` | Outside substrate | No | Instrumentation is off on the planner editor. |
| Character canvas tab | `PUT .../entity-pages/:tabId/blocks` | Does **not** call substrate | No | Independently stored rich-text. |
| Writing-session ping | Blur → `POST .../authoring/writing-session` | `CampaignActivity` `WRITING_SESSION` | Yes — client `wordDelta` plus session minutes | Can double-count words with the subsequent save. Ends on blur, not 15-minute idle. |
| Import / restore / seed / migration / repair | Bulk create/update | Provenance on `NarrativeEvent.source`; many paths set `emitEvents: false` | No when events are suppressed | Pages still receive current `WikiPageStats.wordCount`. |
| Plugin content-sync | Create/update wiki or journal | Wiki path **does** emit substrate events with `actorUserId` | Yes on wiki collections | Origin is integration, not silent human writing. Timeline-event collection has no actor column. |

Word count today is whitespace-split markdown (`countWordsInBlocks`), not a
formatting-aware prose diff. `NarrativeEvent.metadata` stores net `wordDelta`
only.

## Privacy — existing public aggregate exposure

**Release blocker. Remediated in PR 2.**

Three visibility contexts:

1. **Public campaign** — `discoverability = public` (legacy `unlisted` is private).
2. **Viewer-authorized campaign** — public campaigns plus campaigns the
   current viewer also belongs to.
3. **Private / hidden campaign** — owner-only; never enters public aggregates.

`GET /api/users/:id/creator-attribution` and any public-profile aggregate
use the **public** context for counts. Shared membership is not enough to
put a private campaign into public totals. `linkableCampaigns` remains
separately gated (public GM campaigns plus shared memberships).

Owner `GET /api/user/creator-attribution` and `GET /api/user/statistics`
use the **owner** context (all current non-archived memberships, optional
`campaignId` filter). Habits stay owner-only.

`WikiPage.visibility` is still unused for these counts. Hidden wiki inside
a public campaign the creator belongs to can still appear in public
snapshot totals.

## Timezone reuse

Personal statistics must **not** add a timezone setting or API override.

Esiana already resolves reporting timezones in
`backend/src/lib/timezone.ts` `resolveEffectiveTimezone`, used by profile
serialization (`effectiveTimezone`) and notifications:

1. **User timezone** — `User.timezone` when configured.
2. **Global admin default** — `SystemSetting.defaultTimezone`.
3. **UTC** — `DEFAULT_TIMEZONE` only if neither configuration is available.

All activity timestamps continue to be stored in UTC (`NarrativeEvent.createdAt`,
`CampaignActivity.createdAt`, future contribution/session rows).

PR 2 will pass the resolved zone into the statistics service. That zone
determines calendar-day boundaries, writing streaks, weekly rhythms, favorite
writing hours, monthly and yearly periods, and writing-session display.

`UserWritingDailyRollup.date` remains a legacy UTC bucket. PR 2 rebuilds
habit day boundaries from `NarrativeEvent.createdAt` and
`CampaignActivity` writing-session timestamps in the resolved timezone.
Changing `User.timezone` or the inherited admin default regroups those
UTC instants; the original rows are not rewritten.

`GET /api/user/statistics` reports the resolved `timeZone`. It does not
accept a timezone override. Range modes are half-open UTC intervals
derived from that zone. Lifetime views have `range.start = null`.

## Campaign activity coverage matrix

Every supported module has an explicit disposition. Milestone B acceptance:
no silent omissions.

Disposition:

- **Tracked** — a durable actor and action already exist (cited).
- **Intentionally excluded** — with a reason.
- **Blocked** — missing instrumentation; named dependency.

| Module | Disposition | Authoritative record today | Gap |
| --- | --- | --- | --- |
| Wiki pages (`PAGES` and typed workspaces) | Tracked | `WikiPage.createdByUserId`; `WikiPageStats.lastEditedByUserId`; `NarrativeEvent` `PAGE_CREATED` / `PAGE_EDITED`; `CampaignActivity` `WIKI_PAGE` | Net word delta only; no added/removed; last writer overwrites. |
| Characters workspace | Tracked | Same wiki substrate; codex type `CHARACTER` | Tree category not used in personal counts. |
| Locations workspace | Tracked | Same; `LOCATION` | Same. |
| Organizations workspace | Tracked | Same; `ORGANIZATION` | Same. |
| Families, ancestries, objects, bestiary, rules, adventures, threads, havens, projects | Tracked (wiki create/edit) | Same substrate when the page is a wiki page | Personal lifetime mix may include them; dedicated metrics are reserved, not computed. |
| Events / eras wiki pages | Tracked (wiki create/edit) | Wiki substrate | Chronology-specific actions are separate rows below. |
| Custom workspaces (`CampaignWorkspace.CUSTOM`) | Tracked (wiki create/edit) | Wiki substrate when content is a `WikiPage` | No first-class index route; must stay on the source registry, not hardcoded queries. |
| Workshop drafts | Partial / blocked for words | Autosave updates stats with `emitEvents: false`; apply/formalize emits `PAGE_EDITED` | Active writing time during unpublished editing is not durably attributed. Word contributions should commit at apply/formalize and dedupe. |
| Session notes | Tracked | Per-author `SESSION_NOTE` + substrate | Uploads look like human saves. |
| Journals workspace pages | Tracked | Wiki substrate | |
| Journal publications | Blocked | `JournalPublication.createdByUserId` / `releasedByUserId` | No word-contribution or session instrumentation. Needs a source-registry extractor. |
| Character canvas tabs | Blocked | `CharacterPageTab.blocks`; `origin` `CORE` / `CUSTOM` / `PLUGIN` / `API` | No actor on save; outside substrate. Independently stored rich-text — required future source-registry target. |
| Character custom fields | Blocked | `CharacterField` with `origin` | Structured fields, not prose. Actor missing on update. |
| Plugin content-sync (wiki collections) | Tracked as integration | Substrate events with `actorUserId` | Must be origin `integration`, not silent human writing. |
| Plugin content-sync (journal / timeline-events) | Blocked | Journal has `createdByUserId`; calendar events have no actor | Timeline-event collection cannot attribute. |
| Relationships / entity graph | Partial | `WikiLink.createdByUserId`; `NarrativeEvent LINK_CREATED`; `EntityRelation` is derived and has **no actor** | Do not treat derived `EntityRelation` rows as authorship. |
| Maps (asset create) | Tracked | `Asset.uploadedByUserId` where `type = 'map'` | Edit of map metadata is not attributed. |
| Map pins, layers, groups, scene objects, keyframes, presets | Blocked | `createdAt` / `updatedAt` only | Need additive `createdByUserId` / `updatedByUserId` and activity rows. |
| Map exploration (pan / zoom / cursor) | Intentionally excluded | None | Not meaningful authorship; do not log. |
| Chronology eras | Tracked | `CampaignEra.createdByUserId` / `updatedByUserId` | No `CampaignActivity` row today. |
| Calendar events | Blocked | `createdAt` / `updatedAt` only; `TIMELINE_EVENT_CREATED` domain event | Need actor columns and durable activity. |
| Time advances (world-advance) | Tracked | `TimeAdvanceSimulationRun` unique on `(campaignId, source, sourceRef, nextEpochMinute)`; `WorldAdvanceReceipt` | Idempotent. |
| Time advances (manual clock) | Partial | `CampaignActivity` `TIME_TRACKING`; clock write | Hook receipts are not de-duplicated when `batchId` is missing. |
| Sessions (timeline + schedule) | Tracked | `CampaignSessionTimeline.authorId`; `CampaignSessionSchedule` status | Planned range is not play duration. |
| Session attendance | Tracked | `SessionAttendance.status` | RSVP, not proof of showing up. Auto-RSVP writes `ATTENDING`. |
| Session recordings / transcripts | Intentionally excluded as play duration | `SessionRecording.durationMs` is audio length | Do not use as session duration. Upload is attributed via `uploadedByUserId`. |
| Session play duration | Intentionally excluded / unavailable | None measured | Campaign statistics already mark `playedDuration` `not_yet_tracked`. |
| Downtime projects / havens / people | Partial | `updatedByUserId` (and some create actors) | No personal-stat projection yet; not silently omitted. |
| Campaign ledger entries | Tracked | `createdByUserId` / `updatedByUserId`; `CampaignActivity` | |
| Tags | Blocked | `Tag` has no actor | Meaningful tag create/edit needs attribution if counted later. |
| Content presence / reveal | Tracked as discovery | `ContentPresenceState.revealedByUserId` | Discovery, not cartography or writing authorship. |
| Recruitment / safety / settings | Intentionally excluded | Administrative, not creative contribution | |
| Keystrokes, cursors, idle editor time, hidden-tab time | Intentionally excluded | None | Surveillance. The 15-minute rule only groups sessions. |

## Proposed migration (not applied in this PR)

Do not introduce a wiki revision-history table. Do not store document bodies
in the statistics layer. Extend existing records; add specialized writing
rows only where current records cannot answer the question.

### Shared activity contract

Prefer extending `CampaignActivity` and `NarrativeEvent` over a parallel
event table:

- Actor, campaign, action, affected entity
- Real-world timestamp and source module
- Create / update / delete or a documented domain action
- Origin: `human` | `integration` | `automation` | `import` | `system`
- Deduplication identity
- Optional quantitative measurements
- Authorization / visibility context

`CampaignActivity.entityType` already accepts module strings
(`WIKI_PAGE`, `TIME_TRACKING`, `WRITING_SESSION`, …). Map and chronology
writes should use that contract once actor columns exist.

### Additive actor columns

| Record | Columns to add |
| --- | --- |
| `MapPin`, `MapLayer`, `MapObjectGroup`, `MapSceneObject`, `MapObjectKeyframe`, `MapPresentationPreset` | `createdByUserId`, `updatedByUserId` |
| `CalendarEvent` | `createdByUserId`, `updatedByUserId` |
| Other coverage-matrix **Blocked** rows | Actor on the authoritative write |

### Specialized writing records

```
WritingContribution
  userId, campaignId
  sourceId            // registry id, not a wiki-only enum
  documentId
  occurredAt          // UTC real-world
  wordsAdded, wordsRemoved, netChange
  narrativeEventId?   // dedupe
  origin              // human | import | automation | integration
  availability        // measured | reconstructed | incomplete
  writingSessionId?
  // no document body, no private title required

WritingSession
  userId
  startedAt, endedAt  // UTC
  activeDurationMs    // focused intervals only
  clientInstanceKey
  completeness        // measured | partial | unavailable
```

`UserWritingDailyRollup` remains a derived UTC/legacy bucket until PR 2
rebuilds groupings from the resolved timezone. Contribution and session rows
are the future source of truth for habits.

Historical backfill may copy `NarrativeEvent.metadata.wordDelta` into
**net-only** contribution rows marked `reconstructed` / `incomplete`. Do not
invent added versus removed. Unknown authorship stays unknown.

## Source registry

The contribution interface is a platform writing contract, not a wiki-only
query list. Each source registers: stable `id`, storage location, prose
extractor, actor resolution, publication/save boundary, and visibility
context. Independently stored rich-text (character tabs, journal
publications, plugin bodies) must be able to register later. Omissions are
coverage-matrix rows, not hardcoded service limits.

Implemented in PR 3 (`backend/src/lib/stats/writing/sourceRegistry.ts`):

- `wiki.page`, `session_note`, `journal.wiki_page` — explicit wiki save
- `workshop.apply` / `workshop.formalize` — publication boundary
- `journal.publication` and `character.tab` — registered, not extracted yet

## Review gates before PR 2–4

Persistent activity records wait for explicit review of:

1. **Public aggregate privacy** — three visibility contexts; no private
   totals on public profiles. PR 2 remediates the leak documented above.
2. **Workshop attribution** — session time during editing; word
   contributions at apply/formalize; dedupe so publication does not
   double-count. A two-hour unpublished workshop session still earns
   session credit.
3. **Word-diff semantics** — measured change between two versions is not
   original authorship. Required tests: substantial same-length rewrites,
   reordered paragraphs, formatting-only edits, replacements, deletions,
   concurrent last-write-wins.
4. **Active-time instrumentation** — 15 minutes groups sessions only.
   Bounded heartbeats; server-side interval merge; no time while idle,
   disconnected, or the tab is hidden.

PR 2 also integrates `resolveEffectiveTimezone` and remediates public
aggregates. No statistics-specific timezone setting.

## Companion metric IDs

The 13 locked IDs are unchanged as identifiers. PR 3 registers owner-only
companions; they do not replace `attribution.wordsAdded` or
`attribution.totalWordsCreated`.

| Metric ID | Meaning |
| --- | --- |
| `attribution.wordsAddedMeasured` | Measured added tokens from save/publication diffs only |
| `attribution.wordsRemoved` | Measured (or reconstructed net-negative) removed tokens |
| `attribution.netChange` | `added - removed` for this save; not original authorship |

Still reserved, not registered:

- Period-scoped created/edited companions
- Domain metrics for maps, chronology, sessions, and archetypes

## PR 3 — Writing contributions

Word-level added/removed is computed at the source's authoritative
save/publication boundary:

1. Extract prose through the registered extractor (wiki blocks today)
2. Ignore formatting-only markup, wiki-link targets, and non-prose blocks
3. Tokenize on Unicode word boundaries
4. Multiset diff → `wordsAdded`, `wordsRemoved`, `netChange`
5. Formatting-only change → `0 / 0 / 0` (the save may still count as an edit)

A word diff measures change between two versions of this save. It is not
proof of original authorship. Collaborative last-write-wins attributes only
this save's delta.

Workshop autosave still uses `emitEvents: false` and does not write
contributions. Apply and formalize commit words against the published page
(formalize vs empty published prose so draft autosaves are not recounted).
Import, restore, seed, migration, repair, and plugin content-sync are
skipped.

`WritingContribution` stores measurements only — no document body or
private title. Rows dedupe on `narrativeEventId`.

Client writing-session `wordDelta` no longer increments rollup or habit
word totals. Session minutes still count. Unmatched historical
`NarrativeEvent.metadata.wordDelta` projects as **net-only**
`reconstructed` / `incomplete` values. Do not invent added versus removed.

`attribution.wordsAdded` now sums contribution added words (with
reconstructed fallback) and is `partial` when any reconstructed rows are
included. Compatibility `/creator-attribution` still returns only the 13
locked IDs.

## PR 4 — Automatic writing sessions

Sessions are inferred, not flushed on every blur.

- Qualifying activity is a user-origin contribution **or** a focused,
  visible, connected editor-update heartbeat. Workshop typing counts even
  when the draft is never published.
- A session starts on the first qualifying activity and ends after **15
  minutes** without one. That window groups sessions; it is not active time.
- Documents in the same campaign belong to one session. Tabs share it.
- `activeDurationMs` is the union of focused intervals. Hidden tabs,
  blur, disconnects, and idle gaps are excluded. Overlapping tabs do not
  double-count.
- Heartbeats are throttled (30s). No keystrokes, cursors, or document
  bodies are stored.
- Words still come from `WritingContribution` rows linked by
  `writingSessionId`, not client `wordDelta`.
- Pre-instrumentation duration is not backfilled from
  `NarrativeEvent.createdAt` gaps. Legacy blur payloads remain `partial`.

The break-nudge UX in `useEditorInstrumentation` is unchanged.

## PR 5 — Writing visualizations and basic export

Owner Writing tab charts use the same `queryPersonalStatistics` projection.
They are omitted from public profiles and from `/creator-attribution`.

| Chart | Source | Notes |
| --- | --- | --- |
| Daily contribution heatmap | `WritingContribution` + `WritingSession` grouped on reporting-timezone civil days | Day click lists that day's sessions and authorized document links (titles owner-only). Lifetime views clip to 371 days. |
| Weekly rhythm | Same points, Monday–Sunday | Session minutes and added words. |
| Hourly distribution | Session start and contribution time in `timeZone` | Not in-world clocks. |
| Added vs removed trend | Daily `wordsAdded` / `wordsRemoved` | Measured change, not original authorship. Reconstructed days are `partial`. |

Charts are custom SVG on surface tokens (`--stats-writing` and the small category palette). Each chart ships a table alternative. Heatmaps, hours, session history, and private titles stay owner-only.

`GET /api/user/statistics/export?format=json|csv&version=1` is owner-only. It includes metric definitions, reporting period, provenance, availability states, writing contributions, daily aggregates, and writing sessions. It never includes document bodies, private titles, other users' activity, or campaign names. Campaigns appear as ids only.
