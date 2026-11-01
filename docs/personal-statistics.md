# Personal statistics

Personal Statistics is the owner-facing and public-profile view of a user's
creative work across authorized campaigns. It is a **projection** of campaign
activity records, not a separate measurement system.

This document freezes Esiana 1.10 PR 1: current metric IDs and formulas,
known inaccuracies, campaign activity coverage, timezone reuse, the proposed
migration, and review gates for later PRs. **No calculation in this PR
changes.** Compatibility endpoints stay:

- `GET /api/user/creator-attribution` (owner, includes habits)
- `GET /api/users/:id/creator-attribution` (public strip)

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

**Release blocker for Milestone A. Documented here; remediating is PR 2.**

Three visibility contexts must be distinguished later:

1. **Public campaign** — discoverable/public campaigns the subject exposes.
2. **Viewer-authorized campaign** — campaigns the current viewer may see
   (shared membership, and so on).
3. **Private / hidden campaign** — owner-only; must never enter public
   aggregates.

Current behavior (`resolveLinkableCampaigns` comment: “Visibility gates links
only — never used for attribution counts”):

- Public API and public profile **strip** `attribution.totalEdits` and all
  five habit metrics via `filterMetricsByPrivacy(..., 'publicProfile')`.
- Public **word, page, entity, connection, and table-count** totals still
  include every current non-archived membership, including private campaigns.
- `linkableCampaigns` is the only public list, so a high public word count
  beside a short public campaign list can reveal hidden participation.

`WikiPage.visibility` is unused for these counts. Hidden wiki inside a
campaign the creator still belongs to is included.

PR 2 must compute public aggregates from the public-campaign context only.
Owner and viewer-authorized queries may include campaigns those viewers can
access. Do not treat “totals without links” as privacy-preserving.

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

`UserWritingDailyRollup.date` is currently UTC midnight. After PR 2, derived
daily groupings and habit projections are recalculated from authoritative UTC
timestamps whenever the user's timezone (or the inherited admin default)
changes. Original activity records are not rewritten.

Current habit metrics do **not** call `resolveEffectiveTimezone`. That is a
known inaccuracy, not changed in this PR.

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

## Source registry (later implementation)

The contribution interface is a platform writing contract, not a wiki-only
query list. Each source registers: stable `id`, storage location, prose
extractor, actor resolution, publication/save boundary, and visibility
context. Independently stored rich-text (character tabs, journal
publications, plugin bodies) must be able to register later. Omissions are
coverage-matrix rows, not hardcoded service limits.

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

## Reserved companion metric IDs (not registered)

These IDs are reserved in documentation only. They are **not** in
`METRIC_REGISTRY` and must not replace the 13 locked IDs.

- `attribution.wordsAddedMeasured`
- `attribution.wordsRemoved`
- `attribution.netChange`
- Period-scoped created/edited companions
- Domain metrics for maps, chronology, sessions, and archetypes

## Review limits

This PR adds registry metadata, regression tests that freeze current
formulas and privacy flags, and this audit. It does not change endpoints,
rollup writers, or public totals. Production-sized histories and live
timezone-boundary checks wait for PR 2.
