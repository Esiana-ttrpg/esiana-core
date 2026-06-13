# Tenant isolation audit

Pre-1.0 refresh (Phase 9 Step 4). **Pass** = scope middleware + membership/role + `campaignId` in queries.

## Tenant isolation invariants

1. Every campaign route must establish `req.campaign`.
2. Every mutation must enforce membership or stronger capability.
3. Every query must include `campaignId` directly or via a validated parent join.
4. Assets inherit campaign visibility — access terminates at the campaign boundary, not `asset.visibility` alone.
5. Campaign-scoped plugins must always execute with an explicit, validated campaign context (`jailedCampaignId` matches intended campaign), including headless paths (scheduler, webhooks, workers), not only HTTP requests.
6. Cross-campaign existence must never be observable — prefer **404** over **403** on campaign-scoped resource IDs.

**404 vs 403:** Cross-campaign object access via `/api/campaigns/:campaignHandle/*` returns 404. Global asset routes (`/api/assets/:id`, `/uploads/:filename`) may return 403 when campaign container access fails.

## Campaign-scoped routers

| Router | Scope middleware | Membership | Notes |
|--------|------------------|------------|-------|
| `/api/campaigns/:campaignHandle/*` | `resolveCampaignScope` | `requireCampaignMembership` | Primary surface (~200+ routes) |
| `/api/campaigns/:campaignId/*` (select routes) | `attachCampaignByIdParam` | per-route | Plugins, join requests, PATCH/duplicate/delete campaign |

Legacy `/api/c/:slug/*` is **not mounted** — sample-data executor updated to `/api/campaigns/:handle/...`.

## World development visibility

| Surface | Audience |
|---------|----------|
| `GET /world-development/pending` | All members (`canResolve` per row) |
| `GET /world-development/history` | GM operational surface only |
| Accepted developments → calendar/lore | Member-visible narrative outcomes |

## Plugin boundaries

| Path | Jail |
|------|------|
| `/api/plugin-runtime/:pluginId/*` (campaign scope) | `campaignHandle` query or `X-Campaign-Handle` + membership; sets `pluginJailedCampaignId` |
| Headless (scheduler, domain events) | Must pass `jailedCampaignId` into `createPluginHostContext` — audit call sites |
| `/api/public/plugin-runtime/:pluginId/*` | Route firewall (register-time path validation) |

**Target (Phase 10.5):** `pluginContext.db` = `getCampaignPrisma(jailedCampaignId)` — plugins never receive raw `prisma`.

## API token scoping timeline

| Phase | When | Behavior |
|-------|------|----------|
| 1 | Shipped | Log warnings on legacy empty-scope bearer tokens |
| 2 | v1.0 | 403 on empty scopes for mutations, assets, exports |
| 3 | Post-1.0 | Explicit scopes on all campaign routes |

## Fixes applied (Phase 9 Step 4 — original)

- `togglePinnedPageShortcut` — verifies wiki page ∈ `campaignId`
- `attachCampaignByIdParam` — `canAccessCampaign` gate
- Static `/uploads` removed — ACL `GET /uploads/:filename` + `GET /api/assets/:id`
- Avatars — `GET /api/users/:id/avatar`

## Fixes applied (pre-1.0 refresh)

### Asset ACL (H-1, H-4)

- Staging ZIP types GM-only on generic read paths; `expiresAt` → 410
- Non-map assets require membership (not container discoverability alone)
- `listCampaignAssets` excludes staging types in Prisma `where` (not post-fetch filter)

### Route middleware (H-2, M-2, M-3)

- Wiki alias / unresolved-wikilink mutations → `requirePageEditAny`
- `getPlayerSessionSummary` → `requireGamemasterSettings`
- `listDevelopmentHistory` → `requireGamemasterSettings`

### Plugin + consistency (H-3, M-8, M-1, M-4)

- Campaign-scoped plugin HTTP jail (`pluginCampaignJail.ts`)
- Public plugin router route firewall
- `deleteCampaign` uses `resolveCampaignIdFromParam`
- Sample-data network paths → `/api/campaigns/:handle/...`

### Prisma defense-in-depth

- Extended `CAMPAIGN_SCOPED_MODELS` (downtime, ledger, lore, narrative, maps metadata, etc.)
- Removed invalid entries without direct `campaignId` (`mapPin`, `calendarEvent`, `sessionAttendance`)
- Service mutations use `updateMany`/`deleteMany` + `assertScopedMutationCount`

## Ongoing patterns

- Mutations: prefer `updateMany({ where: { id, campaignId } })` + count check
- `getCampaignPrisma(campaignId)` available for new code; adoption incremental
- Automated coverage: `src/lib/assetAccess.test.ts`, `src/lib/avatarPaths.test.ts`

## Spot-check before release

- [ ] Imported wiki images load for campaign members
- [ ] Cross-campaign `pageId` in scoped URL → 404
- [ ] Staging ZIP: non-GM → 403; GM → 200; expired → 410
- [ ] Map tiles: `Cache-Control: private` + ETag/304 on repeat load
- [ ] Observer cannot mutate wiki aliases / wikilinks (UI hidden + API 403)
- [ ] Player session summary hidden from non-GM UI
- [ ] Campaign-scoped plugin route without `campaignHandle` → 400
