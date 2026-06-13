import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import type {
  OffscreenPosture,
  QuestTimeEscalationTier,
  QuestTimePayload,
  QuestTimeRules,
} from '@shared/questTimeSimulation';
import { OFFSCREEN_POSTURES, generateEscalationTierId } from '@shared/questTimeSimulation';
import {
  parseQuestTimePayload,
  touchQuestTimelineManual,
  updateQuestTimeRules,
} from '@/lib/questTimePressure';
import { fetchTimeTracking } from '@/lib/timeTrackingApi';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

interface QuestTimePressureEditorProps {
  campaignHandle: string;
  pageId: string;
  metadata: unknown;
  onSaved: (metadata: Record<string, unknown>) => void;
}

function emptyTier(): QuestTimeEscalationTier {
  return {
    id: generateEscalationTierId(),
    afterDays: 7,
    title: 'Pressure builds',
    summary: 'The situation worsens while the party focuses elsewhere.',
  };
}

export function QuestTimePressureEditor({
  campaignHandle,
  pageId,
  metadata,
  onSaved,
}: QuestTimePressureEditorProps) {
  const parsed = parseQuestTimePayload(metadata);
  const [rules, setRules] = useState<QuestTimeRules>(parsed?.rules ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEpoch, setCurrentEpoch] = useState<bigint>(0n);
  const [deadlineDays, setDeadlineDays] = useState<string>('');

  useEffect(() => {
    setRules(parseQuestTimePayload(metadata)?.rules ?? {});
  }, [metadata]);

  useEffect(() => {
    void fetchTimeTracking(campaignHandle)
      .then((bundle) => {
        try {
          setCurrentEpoch(BigInt(bundle.currentEpochMinute));
        } catch {
          setCurrentEpoch(0n);
        }
      })
      .catch(() => setCurrentEpoch(0n));
  }, [campaignHandle]);

  async function persist(nextRules: QuestTimeRules) {
    setSaving(true);
    setError(null);
    try {
      const result = await updateQuestTimeRules(campaignHandle, pageId, nextRules);
      setRules(parseQuestTimePayload(result.metadata)?.rules ?? nextRules);
      onSaved(result.metadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save time pressure');
    } finally {
      setSaving(false);
    }
  }

  async function applyDeadlineDays() {
    const days = Number.parseInt(deadlineDays, 10);
    if (!Number.isFinite(days) || days <= 0) return;
    const expiresAtEpochMinute = (currentEpoch + BigInt(days * 1440)).toString();
    const next = { ...rules, expiresAtEpochMinute };
    setRules(next);
    await persist(next);
  }

  async function clearDeadline() {
    const next = { ...rules, expiresAtEpochMinute: null };
    setRules(next);
    await persist(next);
  }

  async function touchNow() {
    setSaving(true);
    try {
      await touchQuestTimelineManual(campaignHandle, pageId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to touch timeline');
    } finally {
      setSaving(false);
    }
  }

  const tiers = rules.ignoredEscalation?.tiers ?? [];

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Time & pressure
        </p>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" /> : null}
      </div>

      {error ? (
        <p className="rounded-md bg-red-950/40 px-2 py-0.5 text-[11px] text-red-300">{error}</p>
      ) : null}

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={rules.isTimePressurePaused === true}
          onChange={(e) => {
            const next = {
              ...rules,
              isTimePressurePaused: e.target.checked,
              pausedReason: e.target.checked ? rules.pausedReason ?? '' : null,
            };
            setRules(next);
            void persist(next);
          }}
        />
        Pause time pressure
      </label>
      {rules.isTimePressurePaused ? (
        <input
          className={fieldClass}
          placeholder="Pause reason (optional)"
          value={rules.pausedReason ?? ''}
          onChange={(e) => setRules({ ...rules, pausedReason: e.target.value })}
          onBlur={() => void persist(rules)}
        />
      ) : null}

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          className={fieldClass}
          type="number"
          min={1}
          placeholder="Deadline in days from now"
          value={deadlineDays}
          onChange={(e) => setDeadlineDays(e.target.value)}
        />
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1 text-xs hover:bg-elevated/40"
          onClick={() => void applyDeadlineDays()}
        >
          Set deadline
        </button>
      </div>
      {rules.expiresAtEpochMinute ? (
        <p className="text-[11px] text-muted-foreground">
          Deadline epoch: {rules.expiresAtEpochMinute}
          {' · '}
          <button type="button" className="text-primary hover:underline" onClick={() => void clearDeadline()}>
            Clear
          </button>
        </p>
      ) : null}

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={rules.autoFailOnExpiry === true}
          onChange={(e) => {
            const next = { ...rules, autoFailOnExpiry: e.target.checked };
            setRules(next);
            void persist(next);
          }}
        />
        Auto-fail when deadline passes
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <input
          className={fieldClass}
          type="number"
          min={1}
          placeholder="Offscreen days"
          value={
            rules.offscreenProgress?.totalMinutes
              ? Math.round(rules.offscreenProgress.totalMinutes / 1440).toString()
              : ''
          }
          onChange={(e) => {
            const days = Number.parseInt(e.target.value, 10);
            const totalMinutes =
              Number.isFinite(days) && days > 0 ? days * 1440 : undefined;
            const next: QuestTimeRules = {
              ...rules,
              offscreenProgress: totalMinutes
                ? {
                    totalMinutes,
                    posture: rules.offscreenProgress?.posture ?? 'PASSIVE',
                  }
                : null,
            };
            setRules(next);
          }}
          onBlur={() => void persist(rules)}
        />
        <select
          className={fieldClass}
          value={rules.offscreenProgress?.posture ?? 'PASSIVE'}
          disabled={!rules.offscreenProgress}
          onChange={(e) => {
            if (!rules.offscreenProgress) return;
            const next: QuestTimeRules = {
              ...rules,
              offscreenProgress: {
                ...rules.offscreenProgress,
                posture: e.target.value as OffscreenPosture,
              },
            };
            setRules(next);
            void persist(next);
          }}
        >
          {OFFSCREEN_POSTURES.map((posture) => (
            <option key={posture} value={posture}>
              {posture.charAt(0) + posture.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Ignored escalation tiers</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            onClick={() => {
              const next: QuestTimeRules = {
                ...rules,
                ignoredEscalation: { tiers: [...tiers, emptyTier()] },
              };
              setRules(next);
              void persist(next);
            }}
          >
            <Plus className="h-3 w-3" />
            Add tier
          </button>
        </div>
        {tiers.map((tier, index) => (
          <div key={tier.id} className="rounded-md border border-border bg-elevated/20 p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <input
                className={fieldClass}
                value={tier.title}
                onChange={(e) => {
                  const updated = tiers.map((t, i) =>
                    i === index ? { ...t, title: e.target.value } : t,
                  );
                  setRules({ ...rules, ignoredEscalation: { tiers: updated } });
                }}
                onBlur={() => void persist(rules)}
              />
              <button
                type="button"
                className="text-muted hover:text-red-400"
                onClick={() => {
                  const updated = tiers.filter((_, i) => i !== index);
                  const next: QuestTimeRules = {
                    ...rules,
                    ignoredEscalation: { tiers: updated },
                  };
                  setRules(next);
                  void persist(next);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <textarea
              className={`${fieldClass} min-h-[48px]`}
              value={tier.summary}
              onChange={(e) => {
                const updated = tiers.map((t, i) =>
                  i === index ? { ...t, summary: e.target.value } : t,
                );
                setRules({ ...rules, ignoredEscalation: { tiers: updated } });
              }}
              onBlur={() => void persist(rules)}
            />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input
                className={fieldClass}
                type="number"
                min={1}
                value={tier.afterDays}
                onChange={(e) => {
                  const days = Number.parseInt(e.target.value, 10);
                  const updated = tiers.map((t, i) =>
                    i === index ? { ...t, afterDays: days || 1 } : t,
                  );
                  setRules({ ...rules, ignoredEscalation: { tiers: updated } });
                }}
                onBlur={() => void persist(rules)}
              />
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={tier.autoFail === true}
                  onChange={(e) => {
                    const updated = tiers.map((t, i) =>
                      i === index ? { ...t, autoFail: e.target.checked } : t,
                    );
                    const next = { ...rules, ignoredEscalation: { tiers: updated } };
                    setRules(next);
                    void persist(next);
                  }}
                />
                Auto-fail at tier
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="self-start text-xs text-primary hover:underline"
        onClick={() => void touchNow()}
      >
        Reset pressure clock (party engaged now)
      </button>
    </div>
  );
}

export function QuestTimePressureSummary({ metadata }: { metadata: unknown }) {
  const payload: QuestTimePayload | null = parseQuestTimePayload(metadata);
  if (!payload || (!payload.rules.expiresAtEpochMinute && !payload.rules.offscreenProgress)) {
    return null;
  }
  const parts: string[] = [];
  if (payload.rules.expiresAtEpochMinute) {
    parts.push(`Deadline: epoch ${payload.rules.expiresAtEpochMinute}`);
  }
  if (payload.rules.offscreenProgress) {
    const days = Math.round(payload.rules.offscreenProgress.totalMinutes / 1440);
    parts.push(
      `Offscreen: ${payload.state.elapsedOffscreenMinutes ?? 0}/${payload.rules.offscreenProgress.totalMinutes} min (${payload.rules.offscreenProgress.posture ?? 'PASSIVE'}, ~${days}d)`,
    );
  }
  if (payload.rules.isTimePressurePaused) {
    parts.push('Paused');
  }
  return (
    <p className="text-[11px] leading-relaxed text-muted-foreground">{parts.join(' · ')}</p>
  );
}
