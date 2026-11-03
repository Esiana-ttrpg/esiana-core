# Yearly Wrapped

Yearly Wrapped is an owner-facing storytelling retrospective built on
**Personal Statistics** ([personal-statistics.md](./personal-statistics.md)).
Personal Statistics owns measurement. Wrapped owns storytelling, slide
selection, annual snapshots, and share export.

## Principles

1. Do not invent a parallel event-tracking system.
2. Snapshots preserve **calculation** results (metrics, coverage, slide IDs,
   stable campaign ids). They are not an authorization grant.
3. **Current authorization** controls what can still be viewed or exported.
4. Missing history is never silent zero (`MetricValue` unavailable / partial).
5. Prefer a shorter, strong slide catalog over fabricated achievements.

## Attribution scopes

| Scope | Meaning |
| --- | --- |
| `personal` | Author-attributed / actor-attributed personal activity |
| `campaign` | Spotlight on a campaign the user participated in (authorized presentation) |
| `shared` | Co-participation with others from completed-session attendance only |
| `comparative` | Year-over-year deltas against a prior eligible year |

Do not equate campaign-wide activity with personal participation in narrative copy.

## Ranking (top campaign)

Wrapped reuses the Personal Statistics **active-campaign** ranking contract
exactly (`assembleActiveCampaigns`):

1. Distinct active civil days (primary)
2. Qualified contribution count (secondary)
3. Campaign name (deterministic tie-break)

Word volume is not used. Session attendance/hosted points count as qualified
contributions only where the existing active-campaign points pipeline already
includes them. Selection reason stores those rank inputs under
`ranking: 'active_campaigns_v1'`.

## Coverage and eligibility

Metric families report:
`measured` | `partial` | `reconstructed` | `not_yet_tracked` | `unavailable`.

Gates operate at **metric-family and slide** levels. Incomplete writing coverage
does not reject an entire year when other reliable records support cards.

### Edition tiers (slide count including mandatory intro + summary)

| Slide count | Tier |
| --- | --- |
| 8–15 | `full` |
| 3–7 | `short` |
| &lt; 3 | `unavailable` |

### 2026 partial year

Measured writing reliability begins `2026-11-01`. Wrapped 2026 is a
partial-year writing edition. Intro copy must disclose coverage, e.g.
“Based on activity recorded since November 2026.” Full writing coverage is
expected from 2027 assuming uninterrupted tracking.

## Snapshot schema

`UserWrappedSnapshot` stores versioned JSON (`WrappedCalculationV1`):

- Metrics, coverage, slide IDs, top-campaign rank inputs, referenced campaign ids
- Timezone, generatedAt, edition (`preview` | `completed`)
- **Not stored:** campaign titles, artwork URLs, other auth-dependent strings

### Edition state

Edition is derived from the **target year’s local civil boundaries** in the
user’s effective reporting timezone:

- `preview` while `now` is inside `[Jan 1 year, Jan 1 year+1)`
- `completed` once `now >= Jan 1 year+1` local

Preview editions refresh calculation on read. Completed editions freeze
calculation on first open after local year end (or regenerate). Presentation
is always re-authorized on read.

### Regeneration

`POST /api/user/wrapped/:year/regenerate` rebuilds the calculation.
Never use a side-effecting GET.

## APIs

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/user/wrapped/years` | Eligible years + coverage summaries (owner) |
| GET | `/api/user/wrapped/:year` | Calculation + authorized presentation + slide manifest (owner) |
| POST | `/api/user/wrapped/:year/regenerate` | Rebuild private calculation (does not update published freeze) |
| POST | `/api/user/wrapped/:year/publish` | Freeze current presentation for public access |
| DELETE | `/api/user/wrapped/:year/publish` | Unpublish; public URL immediately 404s |
| GET | `/api/users/:id/wrapped/:year` | Public published edition only (404 otherwise) |
| GET | `/api/user/wrapped/seasonal-invite` | Seasonal invite with availability + CTA href |

On owner read, lost campaign access redacts campaign presentation **and** drops
campaign-scoped ranking rows that would disclose private activity.

### Publication

Wrapped remains **owner-only by default**. Explicit publish stores a **frozen**
`publishedPayload` (calculation + presentation at publish time). Public readers
never call owner statistics APIs and do not receive live campaign membership
re-authorization. Regenerating the private edition does **not** update the
published freeze — republishing is an explicit action.

Unpublished canonical URLs (`/users/:id/wrapped/:year`) return the same 404 as
a missing resource; they must not reveal whether a private edition exists.

### Global feature flags (`SystemSetting`)

| Flag | Default | Effect |
| --- | --- | --- |
| `wrappedEnabled` | on | Disables invite, owner assembly/viewer when off |
| `publicWrappedPublishingEnabled` | on | Blocks new publishes and anonymous access to previously published editions without deleting private snapshots |

PNG download / native image share do not have separate toggles.

## Slide registry

Shared registry (`shared/wrapped/slideRegistry.ts`) defines metadata and
eligibility. Snapshots store only **slide IDs** and metrics — not resolved
manifest metadata. On every read, `buildSlideManifest` applies the current
registry (titles, visualization ids, narrative keys) to those stored IDs so
existing snapshots pick up registry updates without regeneration. The frontend
renders visualization ids from that read-time manifest only — it does not
independently decide eligibility.

Fellow Adventurers is optional and dependency-gated on reliable
**completed-session** `ATTENDING` records. Membership, invitations, and
scheduled-only sessions do not qualify.

## Export privacy (share surface)

PNG export is a separate privacy surface. Only fields on
`WRAPPED_SHARE_SAFE_FIELD_IDS` may appear. Campaign-specific counts that could
reveal restricted activity are excluded by default. Restricted artwork must
never enter the export DOM tree.

Final-card presets (`adventurer` | `worldbuilder` | `storyteller`) change which
allowlisted personal/participation totals are featured — not underlying
measurement. Capture is client-side 1080×1920 via `html-to-image` with themed
CSS fallbacks only (see [wrapped-png-feasibility.md](./wrapped-png-feasibility.md)).

## Seasonal invite

Dec 15–Jan 15 local promotes Wrapped for the **target year**:

- Dec 15–31 → current year preview
- Jan 1–15 → previous year completed

Dismissal key: `wrapped-invite:{year}` (one key for both windows).

Invite `active` stays true during the window (unless dismissed / feature off)
for **feature discovery**. Availability is separate:

| Availability | Meaning | CTA |
| --- | --- | --- |
| `ready` | Full eligible edition | `/users/:id/wrapped/:year` |
| `limited` | Meaningful short edition | same viewer |
| `unavailable` | No qualifying edition | `/wrapped` public intro |

Never promise a personalized edition that navigates to a generic 404.

## Public introduction

`/wrapped` is a public landing page with fictional sample content and
sign-in/registration CTAs. It must not load personal statistics.
