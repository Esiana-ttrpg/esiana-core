import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
  ACCOUNT_KIND_OPTIONS,
  CONFIDENCE_OPTIONS,
  LoreAccountBadge,
  LoreConfidenceDot,
  LoreSliceError,
  LoreStickySubheader,
  VISIBILITY_OPTIONS,
  loreFieldClass,
  loreInterpretationCardClass,
  loreNarrativeText,
  loreSectionLabel,
} from '@/components/entity/lore/LoreKnowledgeUi';
import type { LoreInterpretationAccountRecord } from '@/lib/loreKnowledgeProjection';
import {
  createInterpretationAccount,
  createInterpretationGroup,
  deleteInterpretationAccount,
  deleteInterpretationGroup,
  fetchInterpretationsBundle,
} from '@/lib/loreKnowledgeApi';

interface EntityInterpretationsEditorProps {
  campaignHandle: string;
  pageId: string;
}

export function EntityInterpretationsEditor({
  campaignHandle,
  pageId,
}: EntityInterpretationsEditorProps) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<
    Awaited<ReturnType<typeof fetchInterpretationsBundle>>['groups']
  >([]);
  const [accounts, setAccounts] = useState<LoreInterpretationAccountRecord[]>([]);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupTopicDraft, setGroupTopicDraft] = useState('');
  const [draft, setDraft] = useState({
    title: '',
    narrative: '',
    accountKind: 'UNVERIFIED',
    beliefRegion: '',
    sourceOrigin: '',
    confidence: 'UNVERIFIED',
    visibility: 'GM_ONLY',
    gmResolution: '',
    interpretationGroupId: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const bundle = await fetchInterpretationsBundle(campaignHandle, pageId);
      setGroups(bundle.groups);
      setAccounts(bundle.accounts);
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, pageId]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const byGroup = new Map<string | null, LoreInterpretationAccountRecord[]>();
    for (const account of accounts) {
      const key = account.interpretationGroupId ?? null;
      const list = byGroup.get(key) ?? [];
      list.push(account);
      byGroup.set(key, list);
    }
    return byGroup;
  }, [accounts]);

  async function handleAddGroup() {
    if (!groupTopicDraft.trim()) return;
    await createInterpretationGroup(campaignHandle, pageId, {
      topic: groupTopicDraft.trim(),
    });
    setGroupTopicDraft('');
    setShowGroupForm(false);
    await load();
  }

  async function handleAddAccount() {
    if (!draft.title.trim() || !draft.narrative.trim()) return;
    await createInterpretationAccount(campaignHandle, pageId, {
      title: draft.title.trim(),
      narrative: draft.narrative.trim(),
      accountKind: draft.accountKind as LoreInterpretationAccountRecord['accountKind'],
      beliefRegion: draft.beliefRegion.trim() || null,
      sourceOrigin: draft.sourceOrigin.trim() || null,
      confidence: draft.confidence as LoreInterpretationAccountRecord['confidence'],
      visibility: draft.visibility as LoreInterpretationAccountRecord['visibility'],
      gmResolution: draft.gmResolution.trim() || null,
      interpretationGroupId: draft.interpretationGroupId || null,
    });
    setShowAccountForm(false);
    setDraft({
      title: '',
      narrative: '',
      accountKind: 'UNVERIFIED',
      beliefRegion: '',
      sourceOrigin: '',
      confidence: 'UNVERIFIED',
      visibility: 'GM_ONLY',
      gmResolution: '',
      interpretationGroupId: '',
    });
    await load();
  }

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted" />;

  function renderAccountCard(account: LoreInterpretationAccountRecord) {
    return (
      <article key={account.id} className={loreInterpretationCardClass}>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-serif text-base font-medium text-foreground">{account.title}</h4>
          <LoreAccountBadge kind={account.accountKind} />
          <LoreConfidenceDot confidence={account.confidence} />
        </div>
        <p className={`mt-3 ${loreNarrativeText}`}>{account.narrative}</p>
        {(account.beliefRegion || account.sourceOrigin) && (
          <p className={`mt-2 ${loreSectionLabel} normal-case tracking-normal`}>
            {account.sourceOrigin ? `${account.sourceOrigin}` : null}
            {account.beliefRegion ? ` · ${account.beliefRegion}` : null}
          </p>
        )}
        {account.gmResolution ? (
          <details className="mt-3 rounded border border-border/40 bg-background/40 px-2 py-1">
            <summary className={`cursor-pointer ${loreSectionLabel}`}>
              GM canon resolution (hidden from players)
            </summary>
            <p className="mt-1 text-sm text-muted">{account.gmResolution}</p>
          </details>
        ) : null}
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-1 text-xs text-muted hover:text-destructive"
          onClick={() => void deleteInterpretationAccount(campaignHandle, account.id).then(load)}
        >
          <Trash2 className="size-3.5" />
          Remove
        </button>
      </article>
    );
  }

  return (
    <div className="space-y-4">
      <p className={`${loreSectionLabel} normal-case tracking-normal`}>
        Recorded accounts — multiple truths may coexist. No single answer is required.
      </p>

      {groups.map((group) => {
        const groupAccounts = grouped.get(group.id) ?? [];
        return (
          <section key={group.id} className="space-y-2">
            <LoreStickySubheader badge={`${groupAccounts.length} accounts`}>
              <span className="font-serif text-base normal-case tracking-normal text-foreground">
                {group.topic ?? 'Interpretation'}
              </span>
            </LoreStickySubheader>
            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs text-muted hover:text-destructive"
                onClick={() =>
                  void deleteInterpretationGroup(campaignHandle, group.id).then(load)
                }
              >
                Remove group
              </button>
            </div>
            <div className="space-y-3">{groupAccounts.map(renderAccountCard)}</div>
          </section>
        );
      })}

      {(grouped.get(null) ?? []).length > 0 ? (
        <section className="space-y-2">
          <LoreStickySubheader badge={`${(grouped.get(null) ?? []).length} accounts`}>
            Standalone accounts
          </LoreStickySubheader>
          <div className="space-y-3">{(grouped.get(null) ?? []).map(renderAccountCard)}</div>
        </section>
      ) : null}

      {showGroupForm ? (
        <div className="space-y-2 rounded-lg border border-dashed border-border/70 p-3">
          <input
            className={loreFieldClass}
            placeholder="Topic for this historiographic debate"
            value={groupTopicDraft}
            onChange={(e) => setGroupTopicDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
              onClick={() => void handleAddGroup()}
            >
              Create group
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-sm"
              onClick={() => {
                setShowGroupForm(false);
                setGroupTopicDraft('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {showAccountForm ? (
        <div className="space-y-2 rounded-lg border border-dashed border-border/70 p-4">
          <input
            className={loreFieldClass}
            placeholder="Account title (e.g. Imperial Account)"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />
          <textarea
            className={`${loreFieldClass} min-h-24 text-sm leading-relaxed`}
            placeholder="Narrative account"
            value={draft.narrative}
            onChange={(e) => setDraft((d) => ({ ...d, narrative: e.target.value }))}
          />
          <select
            className={loreFieldClass}
            value={draft.accountKind}
            onChange={(e) => setDraft((d) => ({ ...d, accountKind: e.target.value }))}
          >
            {ACCOUNT_KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className={loreFieldClass}
            value={draft.interpretationGroupId}
            onChange={(e) =>
              setDraft((d) => ({ ...d, interpretationGroupId: e.target.value }))
            }
          >
            <option value="">Standalone (no group)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.topic ?? 'Group'}
              </option>
            ))}
          </select>
          <input
            className={loreFieldClass}
            placeholder="Belief region"
            value={draft.beliefRegion}
            onChange={(e) => setDraft((d) => ({ ...d, beliefRegion: e.target.value }))}
          />
          <input
            className={loreFieldClass}
            placeholder="Source origin"
            value={draft.sourceOrigin}
            onChange={(e) => setDraft((d) => ({ ...d, sourceOrigin: e.target.value }))}
          />
          <select
            className={loreFieldClass}
            value={draft.confidence}
            onChange={(e) => setDraft((d) => ({ ...d, confidence: e.target.value }))}
          >
            {CONFIDENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className={loreFieldClass}
            value={draft.visibility}
            onChange={(e) => setDraft((d) => ({ ...d, visibility: e.target.value }))}
          >
            {VISIBILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <textarea
            className={`${loreFieldClass} min-h-12`}
            placeholder="GM canon resolution (optional, hidden from players)"
            value={draft.gmResolution}
            onChange={(e) => setDraft((d) => ({ ...d, gmResolution: e.target.value }))}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
              onClick={() => void handleAddAccount()}
            >
              Save account
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-sm"
              onClick={() => setShowAccountForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            onClick={() => setShowAccountForm(true)}
          >
            <Plus className="size-4" />
            Add recorded account
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-muted hover:underline"
            onClick={() => setShowGroupForm(true)}
          >
            <Plus className="size-4" />
            Add interpretation group
          </button>
        </div>
      )}
    </div>
  );
}

interface InterpretationsReadPanelProps {
  accounts: LoreInterpretationAccountRecord[];
  error?: string;
}

export function InterpretationsReadPanel({
  accounts,
  error,
}: InterpretationsReadPanelProps) {
  if (accounts.length === 0 && !error) return null;
  return (
    <details className="rounded-lg border border-border/50 bg-muted/5 px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        Interpretations ({accounts.length})
      </summary>
      <div className="mt-3 space-y-3">
        {error ? <LoreSliceError message={error} /> : null}
        {accounts.map((account) => (
          <article key={account.id} className={loreInterpretationCardClass}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-serif text-sm font-medium text-foreground">
                {account.title}
              </div>
              <LoreAccountBadge kind={account.accountKind} />
              <LoreConfidenceDot confidence={account.confidence} />
            </div>
            <p className={`mt-2 ${loreNarrativeText}`}>{account.narrative}</p>
          </article>
        ))}
      </div>
    </details>
  );
}
