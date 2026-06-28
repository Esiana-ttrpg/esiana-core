# Header account nav and campaign switcher

Plan for global chrome alignment with [experience-doctrine.md](../experience-doctrine.md) §Action placement.

## Mental model

The switch panel is a **routing surface**, not a content or management surface.

| Question | Section |
|----------|---------|
| Where did I last work? | **Recent** (up to 3, strict client recency) |
| What do I belong to right now? | **Your Campaigns** (full membership roster) |

| Surface | Purpose |
|---------|---------|
| Campaign Hub (`/`) | Explore, manage, discover |
| Your Campaigns (`/campaigns`) | Membership management |
| Switch panel | Pick one campaign and enter |

## Primary account menu

Identity block → **Switch Campaign ›** → Profile / Settings → Administration (admin) → Log out.

No Plugins row. Plugin `header` slot remains in the header bar.

## Switch panel

- **Recent:** heavier rows (48px thumb/gradient), name, explicit **Current** label, last-opened context.
- **Your Campaigns:** lighter compressed rows — name, role, faint recency.
- **Footer:** Create Campaign only.
- **Interaction:** single click → `campaignPath(handle)` → default entry via `CampaignIndexRedirect`.
- **Excluded:** import, view-all, manage links, inline actions, hub row components.

## Recency

Client `localStorage` (`esiana:campaignRecency`), recorded in `CampaignRecencyRecorder` on campaign shell entry. No backend field in v1.

## Implementation

- `frontend/src/components/layout/account-nav/` — menu and switch panel
- `frontend/src/lib/campaignRecency.ts` — visit tracking
- `CampaignIdentityLink` replaces `CampaignPicker` in campaign header left cluster
