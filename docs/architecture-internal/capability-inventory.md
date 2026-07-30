# Campaign Capability Inventory (Pre-ACL Baseline)

**Status:** Signed off for Phase 2 migration (2026-06)  
**Related:** [campaign-access-model.md](./campaign-access-model.md), [capability-migration-audit.md](./capability-migration-audit.md), [`shared/campaignPolicy/`](../../shared/campaignPolicy/)

---

## Purpose

Captures **policy** ([`roleGrants.ts`](../../shared/campaignPolicy/roleGrants.ts)) vs **enforcement** (routes/controllers) before and during ACL migration. Use when wiring `can(actor, capability)` and `canEditPage(actor, page)`.

**Legend**

| Symbol | Meaning |
|--------|---------|
| âœ“ | Allowed |
| âœ— | Denied |
| ? | Conditional (flags, ownership, or campaign override) |
| âš  | Policy and enforcement disagree |

---

## Four layers (signed off)

| Layer | Question | User-facing? |
|-------|----------|:------------:|
| Campaign administration | Who manages the campaign container? | Owner settings only |
| Authority | Who can perform actions? | **Hidden** (capabilities) |
| Ownership | Who maintains this page? | Page settings; contextual when edit blocked |
| Visibility | Who can see this? | **Prominent** (indexes, headers, discovery) |

**Design principle:** Visibility is prominent, ownership is contextual. See [capability-migration-audit.md Â§3.6](./capability-migration-audit.md).

---

## Target page capabilities (replaces `wiki.edit`)

| Capability | Meaning |
|------------|---------|
| `page.create` | Create wiki pages |
| `page.edit_owned` | Edit `USER`-owned pages where `ownerUserId === actor` |
| `page.edit_party` | Edit `PARTY`-owned pages where `actor.partyId === ownerPartyId` |
| `page.edit_any` | Staff bypass â€” any page regardless of ownership |

**Ownership targets:** `STAFF` | `USER` | `PARTY` â€” chosen at create, not category-driven. `Party` entity (one default per campaign in B0).

| Role | `page.create` | `page.edit_owned` | `page.edit_party` | `page.edit_any` |
|------|:-------------:|:-----------------:|:-----------------:|:---------------:|
| GM | âœ“ | âœ“ | âœ“ | âœ“ |
| Writer | âœ“ | âœ“ | âœ“ | âœ“ |
| Participant | âœ“ | âœ“ | âœ“ | âœ— |
| Observer | âœ— | âœ— | âœ— | âœ— |

---

## Narrative collaboration matrix (target)

| Capability | GM | Writer | Participant | Observer | Notes |
|------------|:--:|:------:|:-----------:|:--------:|-------|
| `page.create` | âœ“ | âœ“ | âœ“ | âœ— | Replaces open `POST /wiki` membership gate |
| `page.edit_any` | âœ“ | âœ“ | âœ— | âœ— | Replaces `canManageNotebooks` for staff paths |
| `page.edit_owned` | âœ“ | âœ“ | âœ“ | âœ— | USER-owned pages |
| `page.edit_party` | âœ“ | âœ“ | âœ“ | âœ— | PARTY-owned pages (quest logs, session recaps) |
| `quest.edit` | âœ“ | âœ“ | ? | âœ— | Quest metadata; overrideable for party |
| `thread.edit` | âœ“ | âœ“ | ? | âœ— | Thread metadata |
| `chronology.edit` | âœ“ | âœ“ | ? | âœ— | Contributor flag + `allowPlayerChronologyManagement` |
| `rumor.moderate` | âœ“ | âœ“ | âœ— | âœ— | Spread/retract |
| `rumor.create` | â€” | â€” | â€” | âœ— | **Deferred** â€” keep GM-authored; no dedicated cap yet |
| `assets.upload` | âœ“ | âœ“ | ? | âœ— | Split from `assets.manage`; party via override |
| `assets.delete_owned` | âœ“ | âœ“ | ? | âœ— | Requires `Asset.uploadedByUserId` |
| `maps.edit` | âœ“ | âœ“ | âœ— | âœ— | Cartography â€” separate from generic upload |

Participant `?` rows: configurable via `CampaignRoleCapabilityOverride` (Phase D).

---

## Resolved decisions (formerly open)

| Topic | Decision |
|-------|----------|
| Party wiki write | **Ownership-based:** `page.create` + `page.edit_owned` / `page.edit_party`; not blanket `wiki.edit` |
| `chronology.edit` | Expose `chronologyContributor` in membership API; wire frontend `useCampaignPolicy` (Phase C) |
| `rumor.create` | **No cap** â€” rumors remain staff-moderated; players use wiki create with PARTY ownership if needed |
| `journal.create` | **Absorbed** into `page.create` + default `USER` ownership; layout still staff or owned-page edit |

---

## Legacy registry

Removed in Phase 3 (`world.edit`, `wiki.edit`, `assets.manage`, etc.). Historical matrix in git history; active grants in [`roleGrants.ts`](../../shared/campaignPolicy/roleGrants.ts).

---

## Enforcement architecture (target)

```mermaid
flowchart TB
  policy["shared/campaignPolicy can() + canEditPage()"]
  acl["backend/lib/acl.ts"]
  routes["requireCapability / requireNonObserver"]
  policy --> acl
  acl --> routes
  routes --> controllers
  ownership["WikiPage.ownerType + Party"]
  ownership --> controllers
```

### Drift hotspots (migration status)

**Phases Aâ€“E + Phase 3 closed** (see [todo.md](../../todo.md)).

1. **Observer write leak** â€” **Resolved** (Phase A)
2. **`world.edit` shim** â€” **Removed** (Phase 3 route split)
3. **Read/write conflation on wiki lists** â€” **Resolved** (Phase 3: `hasElevatedView` for `wikiPageVisibilityFilter`)
4. **Frontend `isDMUser`** â€” **Bridged** (prop rename â†’ UI polish / Campaign access UI polish)
5. **Visibility chips on all browse surfaces** â€” **Resolved** (Visibility System Phase 3 â€” maps hub, chronology feed/timeline; quest/threads/codex shipped in Phase C+)

---

## Tests

```bash
node --import tsx --test shared/campaignPolicy/policy.test.ts
```

Follow-on: visibility presentation; billing/ACL out of this track.
