import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react';
import { ChronologyDateFields, formatChronologyDateLabel } from '@/components/entity/ChronologyDateFields';
import {
  LoreSliceError,
  USAGE_TYPE_OPTIONS,
  VISIBILITY_OPTIONS,
  loreFieldClass,
  loreSectionLabel,
} from '@/components/entity/lore/LoreKnowledgeUi';
import { formatAliasUsageTypeLabel } from '@/lib/loreKnowledgeProjection';
import type { EntityHistoricalAliasRecord } from '@/lib/loreKnowledgeProjection';
import {
  createHistoricalAlias,
  deleteHistoricalAlias,
  fetchHistoricalAliases,
  updateHistoricalAlias,
} from '@/lib/loreKnowledgeApi';

interface EntityIdentityHistoryEditorProps {
  campaignHandle: string;
  pageId: string;
  pageTitle: string;
  bare?: boolean;
}

export function EntityIdentityHistoryEditor({
  campaignHandle,
  pageId,
  pageTitle,
}: EntityIdentityHistoryEditorProps) {
  const [aliases, setAliases] = useState<EntityHistoricalAliasRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    label: '',
    context: '',
    usageType: 'OFFICIAL',
    visibility: 'GM_ONLY',
    isPrimaryInEra: false,
    isSecret: false,
    playerDiscoverable: true,
    regionsText: '',
    eraStart: null as EntityHistoricalAliasRecord['eraStart'],
    eraEnd: null as EntityHistoricalAliasRecord['eraEnd'],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchHistoricalAliases(campaignHandle, pageId);
      setAliases(data.aliases);
    } catch {
      setAliases([]);
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, pageId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      await createHistoricalAlias(campaignHandle, pageId, {
        name: draft.name.trim(),
        label: draft.label.trim() || null,
        context: draft.context.trim() || null,
        usageType: draft.usageType as EntityHistoricalAliasRecord['usageType'],
        visibility: draft.visibility as EntityHistoricalAliasRecord['visibility'],
        isPrimaryInEra: draft.isPrimaryInEra,
        isSecret: draft.isSecret,
        playerDiscoverable: draft.playerDiscoverable,
        eraStart: draft.eraStart,
        eraEnd: draft.eraEnd,
        regions: draft.regionsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setDraft({
        name: '',
        label: '',
        context: '',
        usageType: 'OFFICIAL',
        visibility: 'GM_ONLY',
        isPrimaryInEra: false,
        isSecret: false,
        playerDiscoverable: true,
        regionsText: '',
        eraStart: null,
        eraEnd: null,
      });
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(aliasId: string) {
    await deleteHistoricalAlias(campaignHandle, aliasId);
    await load();
  }

  async function patchAlias(
    aliasId: string,
    patch: Partial<EntityHistoricalAliasRecord>,
  ) {
    await updateHistoricalAlias(campaignHandle, aliasId, patch);
    await load();
  }

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted" />;
  }

  return (
    <div className="space-y-3">
      <p className={`${loreSectionLabel} normal-case tracking-normal`}>
        Timeline-aware names for this entity. Canonical page title remains{' '}
        <span className="font-medium text-foreground">{pageTitle}</span>.
      </p>

      <div className="rounded-lg border border-border/60 bg-muted/10 px-4 py-3">
        <div className="text-[15px] font-medium leading-snug text-foreground">{pageTitle}</div>
        <div className={loreSectionLabel}>Current name</div>
      </div>

      <ul className="space-y-2">
        {aliases.map((alias) => {
          const open = expandedId === alias.id;
          return (
            <li
              key={alias.id}
              className="rounded-lg border border-border/60 bg-background/50"
            >
              <button
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2 text-left"
                onClick={() => setExpandedId(open ? null : alias.id)}
              >
                {open ? (
                  <ChevronDown className="mt-0.5 size-3.5 shrink-0 text-muted" />
                ) : (
                  <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-foreground">{alias.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px] text-muted">
                    {alias.label ? <span>{alias.label}</span> : null}
                    <span className="rounded border border-border/50 px-1 py-0.5">
                      {formatAliasUsageTypeLabel(alias.usageType)}
                    </span>
                    <span>
                      {formatChronologyDateLabel(alias.eraStart ?? null)}
                      {' – '}
                      {formatChronologyDateLabel(alias.eraEnd ?? null)}
                    </span>
                  </div>
                </div>
              </button>
              {open ? (
                <div className="space-y-2 border-t border-border/40 px-3 py-2">
                  {alias.context ? (
                    <p className="text-xs text-muted">{alias.context}</p>
                  ) : null}
                  {alias.regions && alias.regions.length > 0 ? (
                    <div className="text-[11px] text-muted">
                      <span className="font-medium text-foreground">Known by: </span>
                      {alias.regions.join(' · ')}
                    </div>
                  ) : null}
                  <label className="flex items-center gap-2 text-[11px]">
                    <input
                      type="checkbox"
                      checked={alias.isPrimaryInEra}
                      onChange={(e) =>
                        void patchAlias(alias.id, { isPrimaryInEra: e.target.checked })
                      }
                    />
                    Primary name during era
                  </label>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-destructive"
                    onClick={() => void handleDelete(alias.id)}
                  >
                    <Trash2 className="size-3" />
                    Remove
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {showForm ? (
        <div className="space-y-2 rounded-lg border border-dashed border-border/70 p-3">
          <input
            className={loreFieldClass}
            placeholder="Name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
          <input
            className={loreFieldClass}
            placeholder="Era subtitle (e.g. Imperial-era title)"
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          />
          <select
            className={loreFieldClass}
            value={draft.usageType}
            onChange={(e) => setDraft((d) => ({ ...d, usageType: e.target.value }))}
          >
            {USAGE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChronologyDateFields
            label="Era start"
            value={draft.eraStart ?? null}
            onChange={(eraStart) => setDraft((d) => ({ ...d, eraStart }))}
          />
          <ChronologyDateFields
            label="Era end"
            value={draft.eraEnd ?? null}
            onChange={(eraEnd) => setDraft((d) => ({ ...d, eraEnd }))}
          />
          <textarea
            className={`${loreFieldClass} min-h-14`}
            placeholder="Context"
            value={draft.context}
            onChange={(e) => setDraft((d) => ({ ...d, context: e.target.value }))}
          />
          <input
            className={loreFieldClass}
            placeholder="Regions/cultures (comma-separated)"
            value={draft.regionsText}
            onChange={(e) => setDraft((d) => ({ ...d, regionsText: e.target.value }))}
          />
          <select
            className={loreFieldClass}
            value={draft.visibility}
            onChange={(e) => setDraft((d) => ({ ...d, visibility: e.target.value }))}
          >
            {VISIBILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={draft.isPrimaryInEra}
              onChange={(e) =>
                setDraft((d) => ({ ...d, isPrimaryInEra: e.target.checked }))
              }
            />
            Primary name during era
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving || !draft.name.trim()}
              className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
              onClick={() => void handleCreate()}
            >
              Save alias
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1 text-xs"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          onClick={() => setShowForm(true)}
        >
          <Plus className="size-3.5" />
          Add historical alias
        </button>
      )}
    </div>
  );
}

interface IdentityHistoryReadPanelProps {
  aliases: EntityHistoricalAliasRecord[];
  error?: string;
}

export function IdentityHistoryReadPanel({
  aliases,
  error,
}: IdentityHistoryReadPanelProps) {
  if (aliases.length === 0 && !error) return null;

  return (
    <details className="rounded-lg border border-border/50 bg-muted/5 px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        Identity History ({aliases.length})
      </summary>
      <div className="mt-3 space-y-2">
        {error ? <LoreSliceError message={error} /> : null}
        {aliases.map((alias) => (
          <article
            key={alias.id}
            className="rounded-lg border border-border/30 bg-muted/10 px-3 py-2"
          >
            <div className="font-medium text-sm text-foreground">{alias.name}</div>
            <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px] text-muted">
              {alias.label ? <span>{alias.label}</span> : null}
              <span className="rounded border border-border/50 px-1 py-0.5">
                {formatAliasUsageTypeLabel(alias.usageType)}
              </span>
              <span>
                {formatChronologyDateLabel(alias.eraStart ?? null)}
                {' – '}
                {formatChronologyDateLabel(alias.eraEnd ?? null)}
              </span>
            </div>
            {alias.context ? (
              <p className="mt-2 text-xs text-muted">{alias.context}</p>
            ) : null}
            {alias.regions && alias.regions.length > 0 ? (
              <div className="mt-1 text-[11px] text-muted">
                <span className="font-medium text-foreground">Known by: </span>
                {alias.regions.join(' · ')}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </details>
  );
}
