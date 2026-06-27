# Deprecated UI patterns

**Stop introducing these patterns immediately.** Existing instances may remain until a surface pass; **no new instances** in UI PRs.

If you copy an existing component and it uses these patterns, you are copying **legacy UI language**. Converge to the replacement.

Related: [design-philosophy.md](../design-philosophy.md), [density-doctrine.md](./density-doctrine.md), [design-philosophy-checklist.md](./design-philosophy-checklist.md), [experience-doctrine.md](./experience-doctrine.md).

| # | Stop introducing | Why | Use instead | Legacy examples |
|---|------------------|-----|-------------|-----------------|
| 1 | **Uppercase micro-label headers** — `text-[10px] uppercase tracking-wider` zone headings, table column labels | Dashboard/admin tone; cognitive noise | Sentence-case section titles; `text-sm font-medium text-muted` | `frontend/src/components/Sidebar.tsx` `ZoneHeading`, `CampaignSettingsPage.tsx` table `<th>` |
| 2 | **Bordered card nesting >2 levels** — `rounded-lg border` stacks inside bordered panels | Visual competition; HUD layers | `--space-section` gaps; max 1 subtle border per region | Settings sections, widget chrome |
| 3 | **Dashboard-grid-first on narrative surfaces** — `react-grid-layout` as default codex structure | Operator-first density | Editorial flow; grid only in Writing mode / Campaign Home widgets | `DashboardGrid.tsx`, codex layout grid default-on-edit |
| 4 | **Persistent metrics strips** — always-visible KPI/status bars above content | Operational command center | Contextual chips; collapsed by default in Reading | `CampaignStatusStrip.tsx` |
| 5 | **High-contrast dark panel stacks** — hard `border-border` HUD layers | Gaming/admin aesthetic | Soft layering, `border-border/40`, warm neutrals | Campaign settings, admin tables |
| 6 | **Icon-only primary actions** | Accessibility; unclear affordance | Icon + label, or text-primary with icon secondary | Icon-button toolbars |
| 7 | **Dense settings-table layouts on codex read views** | Museum/admin density on narrative surfaces | Progressive disclosure lists, collapsible sections | OK in admin/settings; not codex read mode |
| 8 | **"Dashboard" user-facing copy** | Wrong emotional identity | **Campaign Home** | Sidebar, README, external docs |
| 9 | **Aggressive status colors** — saturated emerald/red for non-destructive states | Alert fatigue | Muted metadata, prose state descriptions | Settings badges, save-status |
| 10 | **Competing simultaneous panels** — sidebar + rail + strip + grid at full density | Buried focal region | One focal region; mode-aware chrome | Campaign Home + codex expanded |
| 11 | **Self-consciously literary labels** on operational surfaces | Clarity degradation | TTRPG-clear terms (Session Notes, Game Master, Writer) | "Master Chronicle Index", Steward |
| 12 | **Ultrawide column proliferation** — more grid columns/panels as viewport widens | Density creep on large monitors | Margins, capped measure, one receded collapsible rail | `DashboardGrid`, `grid-cols-*` escalation at `2xl` |
| 13 | **Nested scroll on primary reading surfaces** — `max-h-*` + `overflow-y-auto` on rails, widget lists, hub bodies | Fractures spatial memory; app-like competing scroll contexts | Single vertical scroll on campaign workspace column; document-flow rails/lists; sticky optional | `CodexRailSidebar` inline rail (legacy), `ReferencesWidget` capped lists |
| 14 | **`overflow-x-auto` on narrative/catalog primary surfaces** — horizontal scroll wrappers on entity detail, catalogs, lore | Information hierarchy mismatched to container; spreadsheet feel | Content priority collapse + responsive reflow (`contentPriorityCollapse.ts`); `min-w-0` + `flex-wrap` / grid stack | `IndexGridView` table wrapper (legacy), mobile tab strips |
| 15 | **"Needs Attention" / attention queue sections** — hub or campaign surfaces with alarmist aggregate status | Equal-weight signals; no gravitational center; classic AI dashboard IA | Single "Continue" or continuity pulse line at focal weight; demote or remove queue | `HubAttentionQueue.tsx` |
| 16 | **Insights / Recommendations blocks** on narrative routes | Secondary analytics competing with campaign state | Fold into continuity stream or recess below focal column | `InsightsSection.tsx`, `ProgressionPage.tsx` |
| 17 | **Duplicate activity feeds** — Recent Activity on hub when Campaign Home owns continuity | Summary explosion; split attention | Campaign Home `CampaignContinuityStream` / `CampaignRecentActivity` only; hub shows resume line | `HubRecentActivity.tsx` |
| 18 | **Summary explosion** — Overview + Highlights + Activity + Insights visible at equal prominence | No gravity; four summaries | One summary region at focal weight; rest progressive disclosure | Entity overview + hero + rail |
| 19 | **Overview dashboard card grids** — equal `DashboardCard` peers on entity Overview tab | Equal visual weight; meta headers shout | Hero as anchor; overview as prose lede + recessed deep links | `*OverviewDashboard.tsx` shells |
| 20 | **Persistent rail as co-primary** — contextual rail same visual weight as focal column in Reading mode | Rail competes for gravity | Rail inspect-only, Writing mode, or dismissed; focal owns center | Codex/entity rails at full density |

IA patterns #15–#20 are **symptoms of gravity failure** per [experience-doctrine.md](./experience-doctrine.md). See also [audits/experience-scorecard.md](./audits/experience-scorecard.md).
