# Campaign workspace UX consistency: initial source audit

Source inventory, 2026-11-04. This is a starting point for independently reviewable migrations, not a claim of visual, responsive, or permission acceptance. The request lists 28 named workspaces (11 + 9 + 4 + 4), although it says 27. Game Master is a Progression label, not an additional workspace.

## Existing infrastructure

- `frontend/src/components/layout/WorkspaceActionBar.tsx` provides wrapping Refine, Sort, View, Mode, trailing and Create slots, with Create last. It does not define an audience slot or a contextual creation menu. `CategoryIndexToolbar` adapts it for category indexes.
- `CategoryIndexRefinePopover`, `CategoryIndexActiveRefineChips`, and `categoryIndexBrowse.ts` supply configurable facets, reset and indicators. The popover also supports custom content; sorting and grouping are not a common engine. Several callers include a list filter within Refine, which needs a product decision against the global-search requirement rather than silently removing useful functionality.
- `categoryBrowseRegistry.ts`, `CategoryIndexViewToggle`, and `categoryIndexBrowseStorage.ts` provide category view definitions and session storage. The latter stores view and refine together, keyed by campaign and category rather than explicitly by user; navigation persistence exists but durable per-user independent preferences are not established.
- `PlayerPerspectiveToggle` supports GM and Party. Adventure Party preview remains disabled until its server data paths are verified.
- `VisibilityTierChip` and `NarrativeVisibilityBadge` are existing visibility presentation candidates; their meanings must be checked against each record's actual policy. `shared/visibilityTier.ts`, wiki visibility helpers, and domain authorization remain authoritative.
- Creation already uses `CreatePageModal` for registered codex types, plus domain-specific dialogs and upload flows. Keep these workflows and their capability checks; a menu should dispatch to them, not replace them.

## Coverage matrix

This matrix records source entry points and observed control families, not an assertion that every nested workflow or access path has been verified. Ã¢â‚¬Å“CategoryÃ¢â‚¬Â means the shared category toolbar/refine/view infrastructure is present in the indicated entry point; it does not imply every capability is implemented. Audience preview is explicitly identified only where observed; ordinary backend authorization still applies elsewhere. For each migration, inspect actual create permissions, search, sort, grouping, indicators, persistence and mobile behavior in context.

| Workspace | Entry point / navigation | Current controls and migration focus |
| --- | --- | --- |
| Adventure | `components/adventure/AdventureView.tsx` | Action bar, Refine and GM/Party control; Party preview is temporarily disabled. Preserve story and subordinate navigation; audit every preview data request. |
| Downtime | `components/downtime/DowntimeView.tsx` | Section tabs and category toolbar; Ledger has Refine, sort and chips. Preserve overview and section-specific actions. |
| Projects | `DowntimeView.tsx`, `DowntimeProjectsSection.tsx` | Downtime section, with its own create/manage workflow and entity routes; audit section filters and preview contract. |
| Havens | `DowntimeView.tsx`, `DowntimeHavensSection.tsx` | Downtime section and entity routes; preserve create/manage and framing. |
| Hirelings | `DowntimeView.tsx`, `DowntimePeopleSection.tsx` | People section; preserve assignments and permission-aware actions. |
| World Events | `DowntimeView.tsx`, `DowntimeWorldEventsSection.tsx` | Downtime section links to chronology; preserve both navigation and event workflows. |
| Reputation | `DowntimeView.tsx`, `DowntimeReputationSection.tsx` | Downtime section; audit visibility and domain-specific actions. |
| Ledger | `DowntimeView.tsx`, `LedgerRefinePopover.tsx`, `LedgerSortControl.tsx` | Refine, sort and active chips; preserve treasury and contribution permissions. |
| Journals | `pages/JournalPage.tsx`, `journal/JournalLibraryTab.tsx`, `JournalPlannerTab.tsx` | Library uses category toolbar; retain Library/Planner and publication access rules. |
| Session Notes | `pages/SessionNotesView.tsx` | Category toolbar and Refine, view tabs, separate upload and create/group/schedule actions. Consolidate only after mapping permissions and empty/organize states. |
| Progression | `pages/ProgressionPage.tsx`, `progression/ProgressionSectionTabs.tsx` | Section navigation including Game Master; audit individual controls and authorization. |
| Characters | `character/CharacterHubView.tsx` | Category toolbar and Refine; preserve character grouping and table. |
| Organizations | `organization/OrganizationHubView.tsx` | Category toolbar; inspect existing organization grouping, creation and visibility. |
| Locations | `wiki/WikiIndexView.tsx` via `pages/WorkspaceIndexPage.tsx` | Category toolbar and Refine; hierarchy is labeled Explorer. Keep actual parent relationships distinct from browse grouping. |
| Maps | `pages/MapsHubPage.tsx` | Category toolbar and Refine, map-specific browse persistence; retain map visibility and upload/editor workflows. |
| Objects | `pages/WorkspaceIndexPage.tsx`, `wiki/WikiIndexView.tsx` | Category browser path; audit configured facets, views and creation for this type. |
| Families | `pages/WorkspaceIndexPage.tsx`, `wiki/WikiIndexView.tsx` | Category browser path; preserve family and relationship navigation. |
| Relations | `pages/RelationsPage.tsx`, `components/relations/` | Specialized relationship projections and canvas; audit access, controls and navigation without redesigning visualization. |
| Bestiary | `bestiary/BestiaryHubView.tsx` | Category toolbar and Refine; preserve catalog-specific behavior. |
| Ancestries | `ancestry/AncestryHubView.tsx` | Category toolbar and Refine; preserve existing table and sections. |
| Calendars | `pages/ChronologyPage.tsx`, `chronology/WidescreenCalendarView.tsx` | Chronology navigation and calendar controls; preserve calendar selection, import and event actions. |
| Timelines | `pages/ChronologyPage.tsx` | Chronology timeline view; retain temporal navigation and event actions. |
| Eras | `pages/ChronologyPage.tsx` | Chronology eras view and document/entity routes; retain management and compare navigation. |
| Events | `pages/ChronologyPage.tsx`, `chronology/ChronologyCreateEventDialog.tsx` | Chronology directory and event details; creation capability and owned-edit permissions are distinct. |
| Rules/Resources | `pages/WorkspaceIndexPage.tsx`, `wiki/WikiIndexView.tsx` | Category browser path; inspect registered facets and create workflow. |
| Tags | `wiki/TagsHubView.tsx` | Category toolbar and Refine; preserve tag-specific navigation and management. |
| Visual Atlas | `pages/VisualAtlasPage.tsx` | Specialized atlas; inspect data visibility and actual controls before choosing shared slots. |
| Recent Changes | `pages/RecentChangesPage.tsx` | Category toolbar; preserve activity semantics and authorization-filtered metadata. |

Threads is also a routed hub (`thread/ThreadHubView.tsx`) using category toolbar and Refine, although not separately listed in the request. Include it in migration planning so existing campaign navigation is not accidentally omitted.

## Migration sequence and review gates

1. **Contracts and tests.** Extend existing action bar and perspective control, with accessible responsive slots and a permission-aware creation menu. Generalize existing browse components incrementally, using module-declared filters, optional grouping and sorting. Keep view selection separate from Refine state and define user/campaign/workspace storage scope, migration, and URL precedence. Do not add unsupported presentations. Test keyboard behavior, reset, persistence, and narrow layouts.
2. **Audience contract per domain.** Define what party means where ownership or member-specific access exists; a single simulated player cannot be assumed to represent every player. Apply a server-enforced reduced perspective to every endpoint feeding a preview, including counts, related records and metadata. Test GM, player, public, manipulated parameters and cross-campaign access. Disable a preview for a workspace until its complete data path is covered. Distinguish DM-only from other restricted visibility labels.
3. **Reference migrations, separate reviews.** Locations: retain Explorer and real hierarchy. Adventure: verify all Party data paths. Session Notes: inventory existing upload, create, schedule, group and organize actions and capability gates before consolidating. Downtime: retain dashboard and section navigation, including Ledger's sort/chips. Verify no actions disappear in empty states.
4. **Remaining groups.** Migrate category hubs, then Downtime sections and Journals/Progression, then chronology, maps/relations and resource surfaces. Include Threads. Each change should identify supported controls, omitted controls and preserved actions; do not impose grouping or a view selector where not meaningful.
5. **Acceptance.** Exercise blank and populated campaigns, desktop/tablet/mobile, navigation persistence, URL sharing where supported, create/upload/import, filters/group/sort/reset, view switching and permission boundaries. Inspect restricted counts, previews and metadata as well as records. Existing tests and a browser pass are both needed; this source audit alone verifies neither.

## Approved implementation decisions

Collection workspaces may use a compact title when useful; dashboard layouts such as Downtime may omit it. Detail and reading pages do not inherit collection controls. Keep the primary action at the far right, with a label where useful, and use existing dialogs and permission checks for creation. Specialized navigation and content-first layouts remain intact.

Extend the existing Refine system: grouping is a presentation and never changes hierarchy; sorting and direction belong in Refine. View selection is independent and offers only implemented views. Global search finds campaign content; a local text filter within Refine can narrow the current collection. Preferences are per user, campaign, and workspace, with URL state taking precedence over stored browse state.

Party preview represents the shared party-visible baseline. Owner-specific access requires a clearly communicated limitation or an explicitly authorized individual perspective. Enable previews only when all domain-specific requests, counts and related data enforce the relevant server-side contract. Public campaign access remains a separate experience, not a workspace perspective. Toolbar migration can proceed without waiting for universal preview support.

## Reviewable implementation order

1. Extend `WorkspaceActionBar` and its existing adapter with compact context, responsive slots and configurable creation actions.
2. Extend Refine and views, including grouping, sorting, indicators and scoped persistence.
3. Standardize audience controls and visibility markers, with domain-specific server preview contracts and tests.
4. Migrate Locations; then Session Notes; then Adventure; then Downtime in separate changes.
5. Migrate remaining workspaces, including Threads, in related groups.

`WorkspaceActionBar` accepts optional `title` and `audience` slots. `create` accepts a single `{ label, onClick, disabled? }`, a `{ label, actions }` menu, or an existing React node. Menu actions use the same single-action shape; callers must supply only authorized actions and retain their existing server-side checks. `CategoryIndexToolbar` forwards the context slots and accepts `createMenu`. Empty menus render no control. These APIs do not introduce a preview or migrate a workspace by themselves.


The existing `CategoryIndexRefinePopover` also accepts optional controlled `grouping` and `sorting` configurations. Each declares its options, current/default value and change callback; sorting additionally declares current/default direction. Reset filters clears the text and facets; Reset all also restores grouping and sorting defaults, leaving the view unchanged. Callers remain responsible for applying choices to authorized visible data, for persistence, and for keeping presentation grouping separate from stored hierarchy. The category view selector respects its registered `allowedViews` and hides itself for a single available view. Locations applies these controls to its flat Cards and Table presentations; Explorer retains its hierarchy and does not offer grouping or sorting.

Locations stores browse and view preferences separately in local storage, scoped by authenticated user, campaign and category. Explicit q, filters, group, sort, direction and view URL parameters override saved values; interactions write history entries. Public viewers use URL state without durable account preferences. The old category snapshot remains in session storage for existing callers, but cannot be safely attributed to an account and is not imported into the new scoped Locations preferences.


## Audience foundation status

The shared audience control uses GM/Party labels and explains that the party baseline can differ from individual access. Restricted access has its own marker; a GM-only or restricted page can also show a separate Draft or Future marker. `canViewSharedPartyBaseline` checks the requesting actor's existing authorization and admits only public or campaign-visible tiers; it deliberately excludes owner/uploader-specific and unknown visibility. This helper is a policy building block, not a complete endpoint preview contract.

Party preview is disabled until every Adventure response and secondary request is verified. `resolveAdventureAudience` supplies a reduced request-local viewer; Quest and Thread hub projections and selected Adventure paths use it. Metadata and storyboard projections omit details whose independent access cannot yet be established. These omissions are temporary and require an explicit product decision before the preview is re-enabled.

The Adventure, Quest, Thread and Character hub handlers, raw storyboard, time-tracking, wiki tree and direct wiki-page handlers reject explicit preview requests from elevated callers while the contract is incomplete. Ordinary player access continues through existing campaign authorization. Public content and public campaign access remain separate from workspace perspectives.
Adventure request inventory for the remaining HTTP and client audit:

- `GET /wiki/adventure-hub[/:pageId]`: section-specific Adventure payloads. Preview guard remains active; scenes, arcs, investigation, scene timeline, sessions and timeline need separate response audits.
- `GET /wiki/quests-hub[/:pageId]` and `/wiki/threads-hub[/:pageId]`: Quest and Thread views. Preview guard remains active; record blocks, lifecycle, associations, backlinks, category metadata and role overrides need endpoint tests.
- `GET /adventure/storyboard`: raw management layout, guarded by management access, and rejects unsupported Party preview requests. It must not be used as a preview data source without a verified reduced contract.
- `GET /time-tracking`: QuestHub passes the Party preview parameter to this secondary request. The handler rejects explicit unsupported Party preview requests; its normal response and state lifetime need audit before preview is enabled.
- Wiki tree/context and related page routes feed navigation and references outside these hub payloads; the browser must not carry a manager-context response into preview, and ordinary page permissions must remain authoritative.

Public is not a workspace perspective. Published campaign access retains its own authorization.

Legacy invalid audience selections are removed from stored workspace preferences on read while preserving unrelated preferences. Missing selections resolve from the current actor's elevated status; they do not grant access. Adventure's rendered subtree is keyed by account, campaign, category and effective perspective so a later verified audience switch starts with fresh component state. Quest's time-tracking request now carries the preview parameter, and standalone Quest, Thread and Character preview controls remain disabled while the server guard is active.

The guarded campaign-router test passes against an isolated schema-only SQLite database for manager and writer preview rejection, ordinary player Quest/Thread and tree access, direct restricted-page denial, and outsider/anonymous denial. The staged SQLite schema omits JSON defaults rejected by Prisma db push; this is not a migration or production parity test. The preview projections remain guarded: expanded HTTP security coverage, secondary-request verification, frontend switching and browser acceptance are still required.

PR 3 delivers the shared controls and containment only. Adventure Party preview implementation and verification are deferred to the separate issue draft in `artifacts/adventure-party-preview-issue.md`; the retained reduced-context code is not authorization to enable it. Character preview needs a separate domain audit. The next workspace migration is Locations toolbar and responsive presentation, using its existing browse-state integration.

Locations now uses the compact collection-header variant and a full-width layout for Table and Explorer. Cards retain the catalog grid. On narrow screens, the Locations table prioritizes its identity and category columns and hides Updated; the existing optional-column controls and browse state remain in place. Party preview is not enabled. A live browser pass used the current frontend against an isolated Docker backend: an empty campaign displayed its create action and opened the creation dialog, and a test location was created in a second campaign. Cards, Table and the no-hierarchy Explorer state were exercised at desktop, 390px and 320px; mobile view controls stayed within the viewport, Refine opened, and Table survived a refresh with its URL parameters. This limited fixture did not verify populated Explorer relationships, inline edits, independent saved preferences, or all creation and filtering paths; those remain to be checked before full browser acceptance.

Session Notes uses one shared Create menu for its existing page, upload, session, schedule and heading actions, with their existing membership, role and management checks. Organize remains separate, and Notes, Attendance and Recaps retain their navigation. For a member without management permission and without sessions, the empty-state note action now opens the existing dialog explaining the session prerequisite. An isolated empty-campaign browser check exercised the menu at desktop, 390px and 320px; populated-session workflows still need browser acceptance.

Adventure uses the compact collection header and shared action bar while retaining its section-specific controls and story navigation. Scene creation uses the shared action styling in both Scenes and Storyboard. Story navigation highlights the selected query view; GM-only sections and the disabled Party preview retain their existing restrictions. In an isolated campaign, a browser check covered the empty and populated Quest view, creation of a test quest, Scenes and Storyboard creation dialogs, and mobile navigation from Storyboard to Quests at desktop, 390px and 320px where applicable. Quest, Arc, Thread, Scene and Storyboard header controls were observed; Party remained disabled. This check did not cover populated scenes or threads, ordinary-player access, or every section action.

Downtime section headers use the compact workspace header with their existing shared toolbar; the overview dashboard and its actions remain unchanged. Section navigation highlights the active query section and the mobile picker supports keyboard selection. Ledger retains Refine, sorting, active chips, treasury actions and capability checks; its ref-dependent actions appear once the section has loaded. An isolated browser check exercised empty Projects, Havens and Hirelings, the World Events chronology link, and an empty and populated Ledger, including entry creation, search and chips. Ledger layout was checked at desktop, 390px and 320px, and mobile keyboard navigation was checked. Populated project, haven and hireling flows and ordinary-player browser checks remain outstanding.

Bestiary and Ancestries use compact collection headers while retaining their existing Refine, Grid/Research, grouping and creation workflows. In an isolated campaign, empty and populated states, test creation, grouping and Research view were exercised for both; Ancestries search and reset were also checked. Toolbar bounds were checked at desktop, 390px and 320px. These checks used a manager account and do not establish ordinary-player permission acceptance.

Characters and Organizations use compact collection headers. Characters places its existing, still-disabled Party preview in the shared audience slot; its Refine, Cards/Table, context rail and create workflow are preserved. Organizations retains its hierarchy, world-state and region groupings and now displays the shared empty state. An isolated manager-account browser check covered empty and populated states, creation, all three organization groupings, Character Cards/Table, and toolbar bounds at desktop, 390px and 320px. Ordinary-player access, populated organization hierarchies and Character context-rail interactions remain to be checked separately.

Objects, Families and Rules/Resources use compact headers in the shared category browser. The browser checks effective page-creation access, omits create guidance for viewers without it, and distinguishes load failures from empty indexes; this also applies to Locations and other callers of the shared browser. Existing view, refine, hierarchy and preference behavior remains in place. An isolated manager-account browser pass covered empty states and creation dialogs for all three, a populated Object in Cards/Table and the empty Nested state, Locations loading, and desktop/390px/320px layout. Populated Families and Rules/Resources, actual nested relationships and ordinary-player browser access remain to be checked.

Tags and Recent Changes use compact headers while retaining tag selection and Refine, and activity grouping, pagination and Refresh respectively. Failed requests now show an error rather than an empty-state message; Tags retries the last requested selection. An isolated manager-account browser pass covered empty Tags and populated Recent Changes, activity expand/collapse and Refresh, and desktop/390px/320px layout. Populated tag management, paginated activity and ordinary-player browser access remain to be checked.

Journal Library uses the compact collection header and the shared Refine popover for its existing type, series, tag and origin filters. Released/Upcoming navigation, sorting, Cards/Table, publication creation and the separate permission-gated Planner remain in place. An isolated manager-account browser check covered empty and populated Library states, type filtering and reset, Refine placement at desktop/390px/320px, and Planner navigation with its existing mobile restriction. Other filters, non-manager permissions and full publication workflows remain to be checked in a browser.

Progression preserves its GM/Writer gate and section navigation; direct links wait for campaign loading before evaluating access. Trajectories and History use compact headers and shared Refine controls for their existing type, status and local text filters. Trajectory creation and era context remain available, and Developments keeps its existing inbox and time-advance actions. History ignores stale requests and exposes retry on failure. An isolated manager-account browser check covered direct links, empty Trajectories and History, the trajectory creation dialog, mobile Refine placement and keyboard section navigation at desktop/390px/320px where applicable. Populated trajectory and History workflows and non-manager browser access remain to be checked.
