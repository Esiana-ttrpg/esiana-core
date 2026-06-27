import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Settings2 } from 'lucide-react';
import type { DowntimeHubLedgerPayload, LedgerSuggestionLine, LedgerTransactionLine } from '@shared/downtimeHub';
import type { WikiTreeNode } from '@/types/wiki';
import {
  acceptLedgerSuggestion,
  dismissLedgerSuggestion,
  deleteLedgerEntry,
  presetForQuickAction,
  type LedgerQuickActionPreset,
} from '@/lib/downtimeLedger';
import { LedgerTransactionFeed } from '@/components/downtime/LedgerTransactionFeed';
import { AddLedgerEntryModal, type LedgerEntryDraft } from '@/components/downtime/AddLedgerEntryModal';
import { LedgerSettingsModal } from '@/components/downtime/LedgerSettingsModal';
import { PendingTreasurySuggestionsPanel } from '@/components/downtime/PendingTreasurySuggestionsPanel';
import { ScheduledTreasuryPanel } from '@/components/downtime/ScheduledTreasuryPanel';
import { consumeScheduledTreasuryPrefill } from '@/lib/downtimeScheduledEffects';
import type { ScheduledTreasuryPrefill } from '@/lib/downtimeScheduledEffects';

interface DowntimeLedgerSectionProps {
  data: DowntimeHubLedgerPayload;
  campaignHandle: string;
  flatPages: WikiTreeNode[];
  canManage: boolean;
  canContribute: boolean;
  onChanged: () => void | Promise<void>;
}

export function DowntimeLedgerSection({
  data,
  campaignHandle,
  flatPages,
  canManage,
  canContribute,
  onChanged,
}: DowntimeLedgerSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<LedgerTransactionLine | null>(null);
  const [acceptingSuggestion, setAcceptingSuggestion] =
    useState<LedgerSuggestionLine | null>(null);
  const [entryDraft, setEntryDraft] = useState<LedgerEntryDraft | null>(null);
  const [schedulePrefill, setSchedulePrefill] = useState<ScheduledTreasuryPrefill | null>(
    null,
  );

  useEffect(() => {
    const prefill = consumeScheduledTreasuryPrefill();
    if (prefill) {
      setSchedulePrefill(prefill);
    }
  }, []);

  const characterOptions = useMemo(
    () =>
      flatPages
        .filter((page) => page.templateType === 'CHARACTER')
        .map((page) => ({ id: page.id, label: page.title })),
    [flatPages],
  );

  const emptyMessage =
    data.feed.length === 0
      ? `${data.framing.headline} ${data.framing.body[0] ?? ''}`
      : undefined;

  async function handleChanged() {
    await onChanged();
  }

  async function handleDelete(line: LedgerTransactionLine) {
    if (!window.confirm(`Delete "${line.title}" from the ledger?`)) return;
    await deleteLedgerEntry(campaignHandle, line.id);
    await handleChanged();
  }

  function openQuickAction(action: LedgerQuickActionPreset) {
    setEditingLine(null);
    setAcceptingSuggestion(null);
    setEntryDraft(presetForQuickAction(action));
    setIsAddOpen(true);
  }

  function openSuggestionEdit(suggestion: LedgerSuggestionLine) {
    setEditingLine(null);
    setEntryDraft(null);
    setAcceptingSuggestion(suggestion);
    setIsAddOpen(true);
  }

  async function handleAcceptSuggestion(suggestion: LedgerSuggestionLine) {
    if (suggestion.amount == null) {
      openSuggestionEdit(suggestion);
      return;
    }
    await acceptLedgerSuggestion(campaignHandle, suggestion.id, {
      entryKind: suggestion.entryKind,
      category: suggestion.category,
      title: suggestion.title,
      amount: suggestion.amount,
      narrative: suggestion.narrative,
      projectId: suggestion.projectId,
      havenWikiPageId: suggestion.havenWikiPageId,
    });
    await handleChanged();
  }

  async function handleDismissSuggestion(suggestion: LedgerSuggestionLine) {
    await dismissLedgerSuggestion(campaignHandle, suggestion.id);
    await handleChanged();
  }

  function closeModal() {
    setIsAddOpen(false);
    setEditingLine(null);
    setAcceptingSuggestion(null);
    setEntryDraft(null);
  }

  return (
    <div className="flex min-h-[480px] w-full flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Ledger</h2>
          <p className="text-sm text-muted-foreground">
            Major income, expenses, debts, and project costs — narrative line items, not a spreadsheet.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage ? (
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Settings2 className="size-3.5" />
              Settings
            </button>
          ) : null}
          {canContribute && data.treasury.sharedTreasuryEnabled ? (
            <>
              <button
                type="button"
                onClick={() => openQuickAction('contribute')}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                Contribute
              </button>
              <button
                type="button"
                onClick={() => openQuickAction('withdraw')}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                Withdraw
              </button>
              <button
                type="button"
                onClick={() => openQuickAction('fund_project')}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                Fund project
              </button>
            </>
          ) : null}
          {canContribute ? (
            <button
              type="button"
              onClick={() => {
                setEditingLine(null);
                setAcceptingSuggestion(null);
                setEntryDraft(null);
                setIsAddOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="size-3.5" />
              Add entry
            </button>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background/60 p-4">
        <p className={META_SECTION_LABEL_CLASS}>Treasury</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {data.treasury.balanceLabel}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.treasury.currencyLabel}
          {data.treasury.openDebtsSummary ? ` · ${data.treasury.openDebtsSummary}` : ''}
          {data.pendingSuggestionsCount > 0
            ? ` · ${data.pendingSuggestionsCount} pending review`
            : ''}
        </p>
      </div>

      <PendingTreasurySuggestionsPanel
        suggestions={data.pendingSuggestions}
        currencySuffix={data.treasury.currencySuffix}
        onAccept={(suggestion) => void handleAcceptSuggestion(suggestion)}
        onEdit={openSuggestionEdit}
        onDismiss={(suggestion) => void handleDismissSuggestion(suggestion)}
      />

      <ScheduledTreasuryPanel
        schedules={data.scheduledTreasury}
        campaignHandle={campaignHandle}
        canManage={canManage}
        initialPrefill={schedulePrefill}
        onChanged={handleChanged}
      />

      <div className="min-w-0 flex-1 rounded-lg border border-border bg-background p-4">
        <h3 className="mb-3 text-sm font-medium text-foreground">Recent transactions</h3>
        <LedgerTransactionFeed
          lines={data.feed}
          emptyMessage={emptyMessage}
          onEdit={
            canContribute
              ? (line) => {
                  setAcceptingSuggestion(null);
                  setEntryDraft(null);
                  setEditingLine(line);
                  setIsAddOpen(true);
                }
              : undefined
          }
          onDelete={canContribute ? (line) => void handleDelete(line) : undefined}
        />
      </div>

      <AddLedgerEntryModal
        open={isAddOpen}
        campaignHandle={campaignHandle}
        editingLine={editingLine}
        initialDraft={entryDraft}
        acceptingSuggestion={acceptingSuggestion}
        characterOptions={characterOptions}
        showContributor={data.treasury.sharedTreasuryEnabled}
        onClose={closeModal}
        onSaved={() => void handleChanged()}
      />

      {canManage ? (
        <LedgerSettingsModal
          open={isSettingsOpen}
          campaignHandle={campaignHandle}
          treasury={data.treasury}
          onClose={() => setIsSettingsOpen(false)}
          onSaved={() => void handleChanged()}
        />
      ) : null}
    </div>
  );
}
