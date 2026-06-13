import { useCallback, useEffect, useMemo, useState } from 'react';
import { Compass, MapPin, Route, ShieldAlert } from 'lucide-react';
import {
  computeEventConsequenceId,
  type EventConsequence,
  type EventConsequenceApplyResult,
  type EventConsequenceKind,
  type QuestHookMode,
} from '@shared/eventConsequence';
import {
  WORLD_IMPACT_TEMPLATE_CARDS,
  formatApplyResultHeadline,
  formatPreviewRows,
} from '@shared/eventConsequencePresentation';
import {
  applyEventConsequences,
  fetchEventConsequences,
  saveEventConsequences,
} from '@/lib/eventConsequencesApi';
import {
  buildPageTitleLookup,
  createOpportunityWikiPage,
} from '@/lib/eventConsequenceSuggestions';
import { WorldImpactRow } from '@/components/chronology/WorldImpactRow';
import type { WikiTreeNode } from '@/types/wiki';

type EditorRow = {
  clientKey: string;
  consequence: EventConsequence;
};

function newClientKey(): string {
  return `wi-${crypto.randomUUID()}`;
}

function toEditorRows(consequences: EventConsequence[]): EditorRow[] {
  return consequences.map((consequence) => ({
    clientKey: newClientKey(),
    consequence,
  }));
}

interface EventConsequencesEditorProps {
  campaignHandle: string;
  calendarEventId: string;
  flatPages: WikiTreeNode[];
  loreBlocks: unknown[];
}

const TEMPLATE_ICONS: Record<EventConsequenceKind, typeof Compass> = {
  quest_hook: Compass,
  alter_location: MapPin,
  route_change: Route,
  haven_threat: ShieldAlert,
};

function emptyConsequence(kind: EventConsequenceKind): EventConsequence {
  const base = {
    kind,
    description: '',
    targets: {},
    payload: {} as EventConsequence['payload'],
    application: { state: 'pending' as const },
  };
  if (kind === 'quest_hook') {
    return {
      ...base,
      id: computeEventConsequenceId({
        kind,
        payload: { mode: 'discover_quest' },
        targets: {},
      }),
      payload: { mode: 'discover_quest' },
    };
  }
  if (kind === 'haven_threat') {
    return {
      ...base,
      id: computeEventConsequenceId({
        kind,
        payload: { label: '' },
        targets: {},
      }),
      payload: { label: '' },
    };
  }
  return {
    ...base,
    id: computeEventConsequenceId({ kind, payload: {}, targets: {} }),
  };
}

export function EventConsequencesEditor({
  campaignHandle,
  calendarEventId,
  flatPages,
  loreBlocks,
}: EventConsequencesEditorProps) {
  const [rows, setRows] = useState<EditorRow[]>([]);
  const [extraPages, setExtraPages] = useState<WikiTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<EventConsequenceApplyResult | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const mergedFlatPages = useMemo(
    () => [...flatPages, ...extraPages.filter((page) => !flatPages.some((p) => p.id === page.id))],
    [flatPages, extraPages],
  );

  const pageTitles = useMemo(() => buildPageTitleLookup(mergedFlatPages), [mergedFlatPages]);

  const inferQuestHookMode = useCallback(
    (pageId: string | null): QuestHookMode => {
      if (!pageId) return 'discover_quest';
      const page = mergedFlatPages.find((entry) => entry.id === pageId);
      return page?.templateType === 'QUEST' ? 'discover_quest' : 'open_thread';
    },
    [mergedFlatPages],
  );

  const handleCreateOpportunityPage = useCallback(
    async (title: string) => {
      const page = await createOpportunityWikiPage(campaignHandle, mergedFlatPages, title);
      setExtraPages((prev) => [...prev, page]);
      return page;
    },
    [campaignHandle, mergedFlatPages],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEventConsequences(campaignHandle, calendarEventId);
      setRows(toEditorRows(data.consequences));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load world impacts');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, calendarEventId]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateRow(index: number, patch: Partial<EventConsequence>) {
    setRows((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      const merged: EventConsequence = { ...current.consequence, ...patch };
      if (patch.targets || patch.payload || patch.kind) {
        merged.id = computeEventConsequenceId({
          kind: merged.kind,
          payload: merged.payload,
          targets: merged.targets,
        });
      }
      next[index] = { ...current, consequence: merged };
      return next;
    });
  }

  function addConsequence(kind: EventConsequenceKind) {
    setRows((prev) => [...prev, { clientKey: newClientKey(), consequence: emptyConsequence(kind) }]);
    setShowTemplatePicker(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const data = await saveEventConsequences(
        campaignHandle,
        calendarEventId,
        rows.map((row) => row.consequence),
      );
      setRows(toEditorRows(data.consequences));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save world impacts');
    } finally {
      setSaving(false);
    }
  }

  async function handleApply(previewOnly: boolean) {
    if (previewOnly) setPreviewing(true);
    else setApplying(true);
    setError(null);
    try {
      await handleSave();
      const result = await applyEventConsequences(campaignHandle, calendarEventId, {
        previewOnly,
      });
      setLastResult(result);
      if (!previewOnly) {
        setRows(toEditorRows(result.consequences));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apply failed');
    } finally {
      setPreviewing(false);
      setApplying(false);
    }
  }

  const previewLines = useMemo(() => {
    if (!lastResult) return [];
    return formatPreviewRows(
      lastResult,
      rows.map((row) => row.consequence),
      pageTitles,
    );
  }, [lastResult, rows, pageTitles]);

  const previewHeadline = lastResult ? formatApplyResultHeadline(lastResult) : null;

  if (loading) {
    return (
      <section className="mb-6 rounded-lg border border-border bg-elevated/20 p-4">
        <p className="text-sm text-muted-foreground">Loading world impact…</p>
      </section>
    );
  }

  return (
    <section className="mb-6 space-y-4 rounded-lg border border-border bg-elevated/20 p-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">World Impact</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe how this event changed the world. Preview before applying — nothing updates until
          you confirm.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No world impacts authored yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row, index) => (
            <WorldImpactRow
              key={row.clientKey}
              row={row.consequence}
              flatPages={mergedFlatPages}
              loreBlocks={loreBlocks}
              inferQuestHookMode={inferQuestHookMode}
              onCreateOpportunityPage={handleCreateOpportunityPage}
              onUpdate={(patch) => updateRow(index, patch)}
              onRemove={() => setRows((prev) => prev.filter((_, i) => i !== index))}
            />
          ))}
        </ul>
      )}

      {showTemplatePicker ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {WORLD_IMPACT_TEMPLATE_CARDS.map((card) => {
            const Icon = TEMPLATE_ICONS[card.kind];
            return (
              <button
                key={card.kind}
                type="button"
                className="flex items-start gap-3 rounded-lg border border-border bg-background/60 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
                onClick={() => addConsequence(card.kind)}
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <span className="block text-sm font-medium text-foreground">{card.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {card.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted/40"
          onClick={() => setShowTemplatePicker((open) => !open)}
        >
          {showTemplatePicker ? 'Cancel' : '+ Add world impact'}
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted/40 disabled:opacity-50"
          disabled={saving || rows.length === 0}
          onClick={() => void handleSave()}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted/40 disabled:opacity-50"
          disabled={previewing || rows.length === 0}
          onClick={() => void handleApply(true)}
        >
          {previewing ? 'Previewing…' : 'Preview'}
        </button>
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          disabled={applying || rows.length === 0}
          onClick={() => void handleApply(false)}
        >
          {applying ? 'Applying…' : 'Apply'}
        </button>
      </div>

      {lastResult ? (
        <div className="space-y-2 rounded-md border border-border/60 bg-background/40 p-3 text-sm">
          <p className="font-medium text-foreground">
            {lastResult.previewOnly ? 'Preview' : 'Applied'}
          </p>
          {previewHeadline ? (
            <p className="text-muted-foreground">{previewHeadline}</p>
          ) : null}
          {previewLines.length > 0 ? (
            <ul className="space-y-1">
              {previewLines.map((line, index) => (
                <li
                  key={`${line.text}-${index}`}
                  className={
                    line.tone === 'blocked'
                      ? 'text-red-600 dark:text-red-400'
                      : line.tone === 'warning'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-muted-foreground'
                  }
                >
                  • {line.text}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
