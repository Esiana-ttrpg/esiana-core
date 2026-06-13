# Campaign economic ledger (Downtime)

Lightweight campaign treasury tracking for **major income, expenses, project costs, upkeep, and debts** — narrative line items, not item inventory or accounting grids.

**Internal ID:** `ledger` (Downtime simulation layer)

**Not the same as:**

- **Investigation dependency ledger** — clue/scene matrix under Adventure ([narrative-investigation-ledger.md](./narrative-investigation-ledger.md))
- **Quest / thread ledgers** — dashboard lifecycle widgets
- **Chronology events ledger** — calendar event views in Chronology Hub

See [downtime-havens-ledger.md](../plans/downtime-havens-ledger.md) Phase 4 for roadmap context.

---

## Design principle: no silent treasury mutation

The ledger is an **event sink**. Upstream systems (project completion, trade signals, quest rewards, opt-in haven transitions) may emit **pending treasury suggestions**. A GM/Writer must **Accept**, **Edit**, or **Dismiss** before the shared balance changes.

There is no automatic `source: system` balance write in the current phase. Accepted suggestions create normal manual entries (`source: manual`) attributed to the approver.

---

## Scope

| In scope | Out of scope |
|----------|--------------|
| Shared campaign treasury balance | Item inventory, weight, SKUs |
| Manual narrative transaction entries | Silent hook-driven debits/credits |
| Pending treasury suggestion queue | Full automation toggle (future) |
| Optional economic metadata on projects / havens / quests | Multi-currency |
| Shared party treasury quick actions + contributor attribution | Per-member sub-balances |
| Categories: upkeep, project, income, reward, trade, donation, debt, other | |
| Recurring treasury schedules (`CampaignScheduledEffect`) | Seasonal / threat schedules (v1.1) |
| Open debts (`debt_open`) + payments (`debt_payment`) | |
| Optional one-line **Context** per entry | |
| Links to projects / havens / contributors | |

---

## Data model

- **`CampaignLedger`** — one row per campaign: currency label/suffix, opening balance, `sharedTreasuryEnabled`
- **`CampaignLedgerEntry`** — append-oriented line items with campaign-time anchor (`occurredAtEpochMinute`); optional `contributorPageId`
- **`CampaignLedgerSuggestion`** — pending proposed line items with idempotency keys; links to accepted entry when resolved

**Treasury math:**

```text
balance = openingBalance + credits + debt_payments − debits
```

`debt_open` entries appear in the feed and open-debt summary but do **not** reduce treasury until a `debt_payment` is logged.

Contracts: [`shared/ledgerMetadata.ts`](../../shared/ledgerMetadata.ts)

---

## Suggestion emitters

| Source | When | Notes |
|--------|------|-------|
| Project completion | Auto or manual complete | Ledger-tagged resources; optional `treasury_effect` outcomes |
| Trade events | World-advance `economic_signal` | Inferred amount — GM fills on accept |
| Quest rewards | Quest lifecycle → COMPLETED | Only when `ledgerReward` metadata is authored |
| Haven upkeep | Major status transition | **Opt-in per haven** + authored `upkeepCost`; never from simulation drift |
| Scheduled effect | `upkeep` time hook | Recurring schedules (`sourceType: scheduled_effect`); see [scheduled-effects.md](./scheduled-effects.md) |

Haven upkeep suggestions use maximum restraint: opt-in flag, authored cost, major transitions only, one pending suggestion per haven.

---

## Manual context

The optional **`narrative`** field is the one-line context slot (UI label: **Context**). Examples:

- `Paid half upfront`
- `Council reimbursement pending`
- `Brakka's share`

Use **`category`** and **`entryKind`** for structural grouping — not a separate notes/tags system.

---

## Permissions

| Action | GAMEMASTER / WRITER | PARTICIPANT | OBSERVER |
|--------|---------------------|-------------|----------|
| View ledger + feed + pending suggestions | Yes | Yes | No (suggestions: GM/Writer resolve) |
| Add entry | Yes | Yes | No |
| Accept/dismiss suggestions | Yes | No | No |
| Edit/delete any entry | Yes | No | No |
| Edit/delete own entry | Yes | Yes | No |
| Ledger settings (currency, opening balance, shared treasury toggle) | Yes | No | No |

---

## API

| Method | Route | Notes |
|--------|-------|-------|
| GET | `/c/:slug/downtime/ledger` | Treasury summary + entries |
| PATCH | `/c/:slug/downtime/ledger` | GM/Writer settings |
| GET | `/c/:slug/downtime/ledger/suggestions` | Pending suggestions |
| POST | `/c/:slug/downtime/ledger/suggestions/:id/accept` | Creates manual entry |
| POST | `/c/:slug/downtime/ledger/suggestions/:id/dismiss` | Dismiss without balance change |
| POST | `/c/:slug/downtime/ledger/entries` | Party (PARTICIPANT+) create |
| PATCH | `/c/:slug/downtime/ledger/entries/:id` | Edit (own or GM/Writer) |
| DELETE | `/c/:slug/downtime/ledger/entries/:id` | Delete (own or GM/Writer) |

Hub payload: `GET /c/:slug/wiki/downtime-hub?section=ledger` includes `pendingSuggestions` and `pendingSuggestionsCount`.

---

## UI

Downtime › **Ledger**:

- Treasury headline
- **Pending treasury events** panel (Accept / Edit / Dismiss)
- Shared-party quick actions when enabled: Contribute, Withdraw, Fund project
- Recent transaction feed with optional contributor attribution

Components: `DowntimeLedgerSection`, `PendingTreasurySuggestionsPanel`, `LedgerTransactionFeed`, `AddLedgerEntryModal`, `LedgerSettingsModal`

---

## Related

- [downtime-projects.md](./downtime-projects.md) — optional `ledgerAmount` on ledger-tagged resources; `treasury_effect` outcomes
- [global-time-hooks.md](./global-time-hooks.md) — `upkeep` hook remains non-mutating; suggestions emit from domain services instead
