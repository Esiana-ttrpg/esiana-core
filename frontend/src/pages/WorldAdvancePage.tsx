import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
function newId(): string {
  return crypto.randomUUID();
}
import { useWiki } from '@/contexts/WikiContext';
import { CampaignMemberRoles } from '@/types/domain';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MascotErrorPanel } from '@/components/errors/MascotErrorPanel';
import {
  applyWorldAdvance,
  previewWorldAdvance,
  type WorldAdvanceBatchSummary,
  listWorldAdvanceBatches,
} from '@/lib/worldAdvanceApi';
import {
  WORLD_ADVANCE_VERSION,
  WorldAdvanceProjectionDomains,
  type WorldAdvanceEffect,
  type WorldAdvancePreview,
} from '@shared/worldAdvance';
import type { TimeAdvanceUnit } from '@shared/timeAdvanceUnits';
import {
  fetchTimeTracking,
  masterCalendarFromBundle,
} from '@/lib/timeTrackingApi';
import { WorldAdvanceConditionPanel } from '@/components/worldAdvance/WorldAdvanceConditionPanel';
import {
  campaignTimeTrackingPath,
  campaignWorldAdvanceBatchPath,
  readCampaignHandle,
} from '@/lib/campaignPaths';

const DOMAIN_ORDER = [
  WorldAdvanceProjectionDomains.FACTION,
  WorldAdvanceProjectionDomains.TERRITORIAL,
  WorldAdvanceProjectionDomains.ECONOMIC,
  WorldAdvanceProjectionDomains.CONFLICT,
  WorldAdvanceProjectionDomains.SEASONAL,
  WorldAdvanceProjectionDomains.NPC_MOBILITY,
] as const;

const DOMAIN_LABELS: Record<string, string> = {
  faction: 'Faction',
  territorial: 'Territorial',
  economic: 'Economic',
  conflict: 'Conflict',
  seasonal: 'Seasonal',
  npc_mobility: 'NPC mobility',
};

const EFFECT_TEMPLATES: Array<{
  label: string;
  build: () => WorldAdvanceEffect;
}> = [
  {
    label: 'War escalates (conflict)',
    build: () => ({
      id: newId(),
      domain: WorldAdvanceProjectionDomains.CONFLICT,
      type: 'conflict_front',
      label: 'Border tensions',
      phase: 'escalating',
      regionPageIds: [],
      orgPageIds: [],
    }),
  },
  {
    label: 'Trade disruption (economic)',
    build: () => ({
      id: newId(),
      domain: WorldAdvanceProjectionDomains.ECONOMIC,
      type: 'economic_signal',
      targetKind: 'location',
      pageId: '',
      signal: 'trade_disruption',
    }),
  },
  {
    label: 'Season context',
    build: () => ({
      id: newId(),
      domain: WorldAdvanceProjectionDomains.SEASONAL,
      type: 'record_season_context',
    }),
  },
];

export function WorldAdvancePage() {
  const params = useParams<{ campaignHandle?: string }>();
  const campaignHandle = readCampaignHandle(params);
  const { campaign, loading: campaignLoading } = useWiki();
  const canManage =
    campaign?.role === CampaignMemberRoles.GAMEMASTER ||
    campaign?.role === CampaignMemberRoles.WRITER;

  const [advanceAmount, setAdvanceAmount] = useState(1);
  const [advanceUnit, setAdvanceUnit] = useState<TimeAdvanceUnit>('days');
  const [bundleTime, setBundleTime] = useState(false);
  const [effects, setEffects] = useState<WorldAdvanceEffect[]>([]);
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<WorldAdvancePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batches, setBatches] = useState<WorldAdvanceBatchSummary[]>([]);
  const [appliedEventId, setAppliedEventId] = useState<string | null>(null);
  const [hasMasterCalendar, setHasMasterCalendar] = useState(true);

  useEffect(() => {
    if (!campaignHandle) return;
    void fetchTimeTracking(campaignHandle)
      .then((bundle) => setHasMasterCalendar(masterCalendarFromBundle(bundle) != null))
      .catch(() => setHasMasterCalendar(false));
  }, [campaignHandle]);

  useEffect(() => {
    if (!hasMasterCalendar && advanceUnit === 'months') {
      setAdvanceUnit('days');
    }
  }, [hasMasterCalendar, advanceUnit]);

  const loadBatches = useCallback(() => {
    listWorldAdvanceBatches(campaignHandle).then((r) => setBatches(r.batches)).catch(() => {});
  }, [campaignHandle]);

  useEffect(() => {
    if (canManage && campaignHandle) loadBatches();
  }, [canManage, campaignHandle, loadBatches]);

  const requestBody = useMemo(
    () => ({
      version: WORLD_ADVANCE_VERSION as typeof WORLD_ADVANCE_VERSION,
      effects,
      note: note.trim() || undefined,
      advanceTime: bundleTime
        ? { amount: advanceAmount, unit: advanceUnit }
        : undefined,
    }),
    [effects, note, bundleTime, advanceAmount, advanceUnit],
  );

  function validateAdvanceTime(): string | null {
    if (bundleTime && advanceUnit === 'months' && !hasMasterCalendar) {
      return 'Month advances require a master fantasy calendar.';
    }
    return null;
  }

  async function runPreview() {
    if (!effects.length) {
      setError('Add at least one effect before previewing.');
      return;
    }
    const advanceErr = validateAdvanceTime();
    if (advanceErr) {
      setError(advanceErr);
      return;
    }
    setError(null);
    setPreviewLoading(true);
    try {
      const result = await previewWorldAdvance(campaignHandle, requestBody);
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function runApply() {
    if (!effects.length) return;
    const advanceErr = validateAdvanceTime();
    if (advanceErr) {
      setError(advanceErr);
      return;
    }
    setError(null);
    setApplyLoading(true);
    try {
      const result = await applyWorldAdvance(campaignHandle, {
        ...requestBody,
        batchIdempotencyKey: newId(),
      });
      setPreview(result);
      setAppliedEventId(result.chronologyEventId);
      loadBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apply failed');
    } finally {
      setApplyLoading(false);
    }
  }

  if (campaignLoading) {
    return <LoadingSpinner label="Loading campaign…" />;
  }

  if (!canManage) {
    return (
      <MascotErrorPanel
        code={403}
        title="DM only"
        description="Advance world state is available to DMs and Co-DMs."
      />
    );
  }

  return (
    <article className="mx-auto max-w-3xl space-y-8 p-6">
      <header>
        <h1 className="text-lg font-semibold text-foreground">Advance world</h1>
        <p className="mt-1 text-sm text-muted">
          Batch living-world changes with chronology audit, derived conditions, and
          narrative synthesis (projection only — not wiki canon).
        </p>
        <p className="mt-2 text-xs text-muted">
          <Link to={campaignTimeTrackingPath(campaignHandle)} className="text-primary hover:underline">
            Time tracking
          </Link>{' '}
          ·{' '}
          <Link to={`/campaigns/${campaignHandle}/chronology`} className="text-primary hover:underline">
            Chronology
          </Link>
        </p>
      </header>

      <section className="space-y-3 rounded-lg border border-border bg-surface/40 p-4">
        <h2 className="text-sm font-semibold text-foreground">Optional clock advance</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={bundleTime}
            onChange={(e) => setBundleTime(e.target.checked)}
          />
          Advance campaign clock with this batch
        </label>
        {bundleTime ? (
          <div className="flex flex-wrap gap-2">
            <input
              type="number"
              min={1}
              className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(Math.max(1, Number(e.target.value) || 1))}
            />
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              value={advanceUnit}
              onChange={(e) => setAdvanceUnit(e.target.value as TimeAdvanceUnit)}
            >
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
              <option value="days">days</option>
              <option value="weeks">weeks</option>
              <option value="months" disabled={!hasMasterCalendar}>
                months
              </option>
            </select>
            {!hasMasterCalendar ? (
              <p className="text-xs text-muted-foreground">
                Month advances require a master fantasy calendar.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-surface/40 p-4">
        <h2 className="text-sm font-semibold text-foreground">Effects</h2>
        <div className="flex flex-wrap gap-2">
          {EFFECT_TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted/20"
              onClick={() => setEffects((prev) => [...prev, t.build()])}
            >
              + {t.label}
            </button>
          ))}
        </div>
        {effects.length === 0 ? (
          <p className="text-sm text-muted">No effects yet. Add a template or build JSON via API.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {effects.map((e, idx) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded border border-border/50 px-2 py-1"
              >
                <span>
                  {DOMAIN_LABELS[e.domain] ?? e.domain}: {e.type}
                </span>
                <button
                  type="button"
                  className="text-xs text-muted hover:text-foreground"
                  onClick={() => setEffects((prev) => prev.filter((_, i) => i !== idx))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <label className="block text-sm">
          <span className="text-muted">GM note (optional)</span>
          <textarea
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={previewLoading || !effects.length}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          onClick={() => void runPreview()}
        >
          {previewLoading ? 'Previewing…' : 'Preview'}
        </button>
        <button
          type="button"
          disabled={applyLoading || !effects.length}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          onClick={() => void runApply()}
        >
          {applyLoading ? 'Applying…' : 'Apply batch'}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {appliedEventId ? (
        <p className="text-sm text-foreground">
          Applied. Chronology event{' '}
          <span className="font-mono text-xs">{appliedEventId}</span>
        </p>
      ) : null}

      {preview ? (
        <section className="space-y-4 rounded-lg border border-border bg-muted/5 p-4">
          <h2 className="text-sm font-semibold text-foreground">Preview</h2>
          <p className="text-xs text-muted">
            At {preview.projectedEpochMinute}
            {preview.asOfLabel ? ` · ${preview.asOfLabel}` : ''}
          </p>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Narrative synthesis (projection)
            </h3>
            <p className="text-sm font-medium text-foreground">{preview.narrativeSynthesis.headline}</p>
            {preview.narrativeSynthesis.paragraphs.map((p, i) => (
              <p key={i} className="text-sm text-foreground">
                {p}
              </p>
            ))}
          </div>

          {preview.conditionSurfaces.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Derived conditions
              </h3>
              <WorldAdvanceConditionPanel preview={preview} effects={effects} />
            </div>
          ) : null}

          {DOMAIN_ORDER.map((domain) => {
            const rows = preview.effectPreviews.filter((r) => r.domain === domain);
            if (!rows.length) return null;
            return (
              <div key={domain}>
                <h3 className="text-xs font-semibold text-muted">
                  {DOMAIN_LABELS[domain] ?? domain}
                </h3>
                <ul className="mt-1 space-y-1 text-sm">
                  {rows.map((r) => (
                    <li key={r.effectId}>
                      {r.summary}
                      {r.pendingConfirmations.length > 0 ? (
                        <span className="ml-1 text-xs text-amber-400">(pending confirm)</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      ) : null}

      {batches.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Recent batches</h2>
          <ul className="space-y-1 text-sm">
            {batches.slice(0, 8).map((b) => (
              <li key={b.chronologyEventId} className="text-muted">
                <Link
                  to={campaignWorldAdvanceBatchPath(campaignHandle, b.chronologyEventId)}
                  className="text-primary hover:underline"
                >
                  {b.headline ?? b.title}
                </Link>{' '}
                · {b.effectCount} effects · epoch {b.targetEpochMinute}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
