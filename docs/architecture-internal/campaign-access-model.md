# Campaign access model

**Status:** Permissions & visibility redesign (Passes 1–3 and 5)  
**Code:** [`shared/campaignPolicy/`](../../shared/campaignPolicy/)  
**Related:** [narrative-projection-semantics.md](./narrative-projection-semantics.md)

---

## Purpose

Campaign authorization is three stacked layers plus per-resource restrictions. Effective access is:

`campaign capabilities (role matrix + overrides + owner/GM union) → module defaults → explicit resource restrictions`

System Admin is instance-level only. Public/Anonymous is not a role. Wiki & Pages grants do not authorize Adventure, Quests, or Characters just because those modules store `WikiPage` rows.

---

## Authority layers

| Layer | Scope | Mechanism | Narrative access |
|-------|--------|-----------|------------------|
| **Application administration** | Instance | `User.role = SYSTEM_ADMIN` + [`systemAdmin`](../../backend/src/middleware/systemAdmin.ts) | None. Recovery and `/api/admin/*` only. A System Admin who is a Player receives Player narrative access. |
| **Campaign owner** | One campaign | `Campaign.campaignOwnerUserId` | Functionally equivalent to Game Master except `campaign.transfer_ownership` and self-membership protections (cannot leave, remove, or change own role). |
| **Membership roles** | One campaign | `CampaignMember.role` + [`roleGrants.ts`](../../shared/campaignPolicy/roleGrants.ts) | Game Master, Writer, Player (`PARTICIPANT`), Observer. |

Application admin checks **never** flow through `can(actor, …)`.

### Roles (authoritative)

| Stored | UI label | Default narrative tier |
|--------|----------|------------------------|
| `GAMEMASTER` | Game Master | Elevated + campaign administration (except transfer) |
| `WRITER` | Writer | Elevated content manage; no campaign delete/admin/transfer |
| `PARTICIPANT` | Player | Party / campaign-visible content; collaborative writes |
| `OBSERVER` | Observer | Party / campaign-visible reads |
| *(none)* | Guest (display only) | Anonymous; see Public gate |

Unknown membership role strings grant **nothing** (they must not collapse to Observer).

### Owner and Game Master

Both receive `roleCapabilitiesFor(GAMEMASTER)` (owner evaluates as GM even if stored as Writer/Player) plus campaign-admin capabilities. Owner-only: `campaign.transfer_ownership`, cannot leave/remove/demote self. Transfer workflow is unchanged.

### Public / Anonymous

Not a fifth role. When the **campaign** public-access gate is on (`Campaign.discoverability === public`), anonymous evaluation uses Observer’s **read** capabilities after Observer overrides (`campaign.view`, `wiki.view_party`, `assets.view`). Writes are never copied.

Anonymous visitors still need the **instance** login gate to allow public-facing access. Campaign public access alone is never sufficient. Live campaign-scoped APIs still require membership (Pass 4 deferred); Pass 4 must enforce both gates.

A publicly accessible Esiana instance is **not** an instance where everyone can see everything. Public content remains subject to campaign access, Observer read capabilities, and resource restrictions.

---

## Capabilities

Canonical registry: [`capabilities.ts`](../../shared/campaignPolicy/capabilities.ts). Defaults: [`ROLE_GRANTS`](../../shared/campaignPolicy/roleGrants.ts). Per-campaign overrides: `CampaignRoleCapabilityOverride` (`GRANT` / `REVOKE`). Non-overridable: delete, transfer, manage roles, campaign visibility, billing.

### What each capability actually gates

| Identifier | Primary module | Also used by | Does not grant |
|------------|----------------|--------------|----------------|
| `campaign.view` | Campaign container | Prerequisite for ordinary reads | Module workspaces |
| `campaign.manage_roles` | Members / Access matrix | — | Narrative GM-only lore |
| `campaign.settings.edit` | Campaign settings (GM) | Audio operational settings | Discoverability (owner/GM admin) |
| `campaign.visibility.edit` | Discoverability | — | Page visibility |
| `campaign.delete` | Campaign container | — | Resource delete |
| `campaign.transfer_ownership` | Owner only | — | Role change |
| `page.create` / `page.edit_owned` / `page.edit_party` / `page.edit_any` / `page.visibility.edit` | **Standalone wiki documents** and authoring | Character **body** edits today go through `canEditPage` (shared identifier — shown once in the matrix) | Adventure Board, Quests, Threads, Session Notes workspaces |
| `wiki.view_party` | Party-tier wiki visibility | Chronology/map/asset party reads | Unrelated module workspaces; not a blanket `wiki.view` |
| `narrative.elevated_view` | GM-only / staff visibility | Maps ghost/staff, audio `staff` recordings | Campaign administration |
| `quest.edit` / `thread.edit` | Native quest/thread records | — | Linked wiki page content |
| `adventure.storyboard.edit` | Adventure Board layout | — | Linked quest/wiki visibility |
| `maps.edit` | Map layers/markers | — | Hidden linked page/asset |
| `assets.upload` / `assets.view` / `assets.delete_*` | Campaign assets | Audio upload (with `audio.manage` or contributor AND-gate) | Bypass recording/session visibility |
| `audio.manage` / `audio.chapters.edit` / `audio.transcript.edit` / `audio.transcript.publish` / `audio.transcribe` | Session recordings | — | Global/campaign audio feature flags |
| `notes.moderate` | Session notes (staff) | Schedule/note admin routes | Standalone wiki `page.*` |
| `chronology.edit` | Events/eras | Player via `allowPlayerChronologyManagement` | Hidden linked wiki pages |
| `discovery.reveal` | Discoveries | — | Page create |
| `safety.submit` / `safety.manage` | Safety reports | Reviewer overrides | Campaign admin |
| `ledger.contribute` | Downtime ledger | — | Haven/project wiki visibility |
| `codex.view_public` | Retired from evaluation | — | Use Observer reads |

---

## Visibility dialects (compatibility)

Stored values are **not** migrated. Evaluation normalizes:

| Stored | Evaluation tier | canView requires |
|--------|-----------------|------------------|
| `Public`, `PUBLIC` | public | `campaign.view` |
| `Party`, `PARTY`, audio `campaign` | campaign | `wiki.view_party` |
| `DM_Only`, `DM_ONLY`, `GM_ONLY`, `ELEVATED_ONLY`, audio `staff` | gmOnly | `narrative.elevated_view` |
| audio `uploader_and_managers` | uploader | uploader or `audio.manage` |
| unknown | deny | never treat as public |

Campaign discoverability (`private` / `public`) is the **campaign** container gate, not page access. It is one of two public-access gates (see below). UI labels: Public / Campaign / GM only. Do not call GM-only “Private”.

---

## Public access gates

There are two separate levels of public access. **Both** must allow before an anonymous visitor can see campaign content.

| Gate | Controlled by | What it decides |
|------|---------------|-----------------|
| **Instance login** | Global Admin | Whether anonymous visitors can access public-facing parts of Esiana at all. |
| **Campaign public access** | Campaign GM / owner | Whether this campaign permits anonymous viewing of Observer-eligible content. |

### Settings copy

**Global Admin → General Settings (Public access)**

- **Require login to access Esiana**
- When enabled, visitors must sign in before accessing campaign content. When disabled, public-facing content can be viewed without an account, subject to campaign permissions.
- Individual campaigns still control whether they are publicly accessible. Disabling the login requirement does not make private campaigns or restricted content public.

**Campaign Settings → Access (Public campaign access)**

- Allow visitors without an account to view content permitted by the Observer's read capabilities and resource visibility restrictions.
- Requires public access to be allowed by the instance administrator.

The instance gate is stored as `SystemSetting.requireLogin` (default true). Until Pass 4, anonymous campaign routes are not enabled, so turning the setting off does not open live anonymous access. It already informs Adventure Public preview and Campaign Settings copy. Toggling campaign public access also does not open live anonymous routes.

### How the two settings interact

| Instance requires login | Campaign allows public | Anonymous campaign access |
|-------------------------|------------------------|---------------------------|
| Yes | No | Blocked |
| Yes | Yes | Blocked |
| No | No | Blocked |
| No | Yes | Allowed, within Observer read permissions |

Code: [`publicAccess.ts`](../../shared/campaignPolicy/publicAccess.ts) (`resolveAnonymousCampaignAccess`). Campaign-only listing/eligibility stays in [`allowsAnonymousCampaignView`](../../shared/campaignPolicy/discoverability.ts).

### Adventure Public preview

Public is a distinct preview perspective, not a role. It stays selectable regardless of the instance login gate so a GM can see what would be publicly eligible if the instance permitted anonymous access.

| Preview condition | UI |
|-------------------|----|
| Campaign public access off | Empty state. Public stays selected. |
| Campaign public access on, instance requires login | Show Observer-eligible content **and** state that public access is currently unavailable on the instance. |
| Both gates allow | Show Observer-eligible content (live anonymous routes remain Pass 4). |

The preview must not change the signed-in user's authorization. It is a presentation projection, not proof of anonymous security.

### Pass 4

When anonymous campaign routes are implemented, they **must** respect both gates. Do not treat `Campaign.discoverability === public` as sufficient admission. Prefer failing closed at the instance login gate before campaign content is considered, then still require the campaign gate, Observer reads, and resource restrictions.

---

## Inheritance

Evaluated dynamically. Do **not** copy module defaults onto every resource.

| Resource | Inherits | Explicit restriction |
|----------|----------|----------------------|
| Wiki page | Module `page.*` + `wiki.view_party` / elevated | Own `visibility`, ownership |
| Wiki child | **None** (no parent→child) | Own visibility |
| Map pin / object / map asset | Linked page or asset visibility | Pin/object override + revelation |
| Attachment | Campaign gate, then asset/map rules | Asset visibility |
| Audio | Session (wiki) visibility, then recording visibility | Recording `visibility` |
| Chronology event | Event visibility **and** linked page separately | Both must pass |
| Character tab | Character page visibility, then tab/`dmOnly` | Tab flags |
| Session note | Note visibility + `notes.moderate` / author | Metadata author |

Linked records never inherit “open” from a public parent.

---

## Resource access management

Game Masters and Writers may change resource visibility when they `canManage` that resource **and** have `page.visibility.edit` (or the module equivalent). Players may edit without managing access. Server validates every PATCH, including API tokens. A caller cannot grant a tier they cannot view or exceed the campaign/module ceiling.

---

## Module vs wiki infrastructure

| Module | Workspace / native cap | Backing `WikiPage` |
|--------|------------------------|--------------------|
| Wiki & Pages | `page.*` | Standalone documents only |
| Adventure | `adventure.storyboard.edit` | Linked pages still independently authorized |
| Quests / Threads | `quest.edit` / `thread.edit` | Linked wiki hidden unless viewer can see that page |
| Characters | Distinct workspace + `canEditPage` on identity page (shared `page.edit_*`) | Page visibility still applies |
| Session Notes | `notes.moderate` or author | Not standalone `page.create` |
| Maps | `maps.edit` | Pins inherit target visibility |
| Audio | `audio.*` + `assets.upload` | Session page must be visible |
| Safety / Integrations | `safety.*` / plugin manifest | Cannot bypass campaign visibility |

---

## Audio: access vs configuration

Role operations live in Settings → Access (`audio.*`, `assets.upload`). Campaign Audio Settings and instance Admin Audio keep providers, storage, quotas, consent, processing, and `enabled`. `allowContributors` / `allowChapters` / `allowTranscripts` remain AND-gates with capabilities.

Globally disabled audio: matrix rows stay visible as **Disabled by Global Admin**. Stored overrides are preserved. Campaign admins cannot bypass.

---

## Authorization boundaries

New requests, new uploads, and new streams use current capabilities. An already accepted upload or open stream is not aborted solely because grants changed. Chunked continuation of that upload may finish; initiating a new upload may not. Suspension, session revocation, and resource removal are immediate.

Override cache in [`campaignScopeContext.ts`](../../backend/src/lib/campaignScopeContext.ts) is invalidated on grant/role writes and is not an authorization window.

---

## Enforcement notes

- Backend is authoritative. Frontend `can()` reflects the same shared evaluator and must receive `roleCapabilityOverrides`.
- Pass 4 (anonymous campaign routes) is **not** enabled. `requireCampaignMembership` remains on `/api/campaigns/:handle/*`. When it is enabled, both public-access gates must allow; campaign discoverability alone is not sufficient.
- No Prisma migration for this pass.

### Intentional privilege changes

- Owner-as-Player/Writer evaluates as Game Master for capabilities.
- Non-owner Game Masters receive former owner functional grants except transfer/self-protection.

### Must not broaden accidentally

- System Admin ≠ GM narrative visibility.
- Writer ≠ campaign admin / campaign delete.
- `DM_Only` stays elevated-only.
- Existing GRANT/REVOKE overrides keep their effect.
- Audio contributor flags stay AND-gates.
