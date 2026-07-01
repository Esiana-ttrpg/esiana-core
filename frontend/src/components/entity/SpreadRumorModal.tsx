import { useEffect, useMemo, useState } from 'react';
import { LoreCirculationExpectationNote } from '@/components/entity/lore/LoreKnowledgeUi';
import { spreadRumor } from '@/lib/rumorEngineApi';
import { useOptionalWiki } from '@/contexts/WikiContext';
import {
  filterLocationPages,
  filterOrganizationPages,
} from '@/lib/questHubLayout';
import type { LorePageLookup } from '@/lib/resolveLoreSourceDisplay';
import type { SpreadRumorTarget } from '@/types/rumorEngine';

const STANCES = [
  { value: 'asserts', label: 'Asserts' },
  { value: 'denies', label: 'Denies' },
  { value: 'distorts', label: 'Distorts' },
  { value: 'mythologizes', label: 'Mythologizes' },
  { value: 'satirizes', label: 'Satirizes' },
] as const;

type SpreadRumorModalProps = {
  campaignHandle: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  sourceClaimId?: string;
  draft?: { statement: string; subjectPageId: string };
  defaultTarget?: SpreadRumorTarget;
  flatPages?: LorePageLookup[];
};

export function SpreadRumorModal({
  campaignHandle,
  open,
  onClose,
  onSuccess,
  sourceClaimId,
  draft,
  defaultTarget,
  flatPages: _flatPages = [],
}: SpreadRumorModalProps) {
  const wiki = useOptionalWiki();
  const wikiFlatPages = wiki?.flatPages ?? [];

  const [stance, setStance] = useState('asserts');
  const [visibility, setVisibility] = useState<'PARTY' | 'GM_ONLY'>('GM_ONLY');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetKind, setTargetKind] = useState<'region' | 'faction'>('region');
  const [targetPageId, setTargetPageId] = useState('');

  const needsTargetPicker = !defaultTarget;

  const regionPages = useMemo(
    () => filterLocationPages(wikiFlatPages),
    [wikiFlatPages],
  );
  const factionPages = useMemo(
    () => filterOrganizationPages(wikiFlatPages),
    [wikiFlatPages],
  );
  const targetOptions = targetKind === 'region' ? regionPages : factionPages;

  useEffect(() => {
    if (!open) return;
    setStance('asserts');
    setVisibility('GM_ONLY');
    setConfirmed(false);
    setError(null);
    setBusy(false);
    setTargetKind('region');
    setTargetPageId('');
  }, [open, sourceClaimId]);

  useEffect(() => {
    if (!needsTargetPicker || !open) return;
    const options = targetKind === 'region' ? regionPages : factionPages;
    if (options.length > 0 && !options.some((p) => p.id === targetPageId)) {
      setTargetPageId(options[0].id);
    }
  }, [needsTargetPicker, open, targetKind, regionPages, factionPages, targetPageId]);

  if (!open) return null;

  const preview =
    draft?.statement ??
    (sourceClaimId ? `Existing claim ${sourceClaimId}` : 'No claim selected');

  function resolveTarget(): SpreadRumorTarget | null {
    if (defaultTarget) return defaultTarget;
    if (!targetPageId) return null;
    if (targetKind === 'region') {
      return { kind: 'region', locationPageId: targetPageId };
    }
    return { kind: 'faction', orgPageId: targetPageId };
  }

  const resolvedTarget = resolveTarget();
  const targetLabel = resolvedTarget
    ? resolvedTarget.kind === 'region'
      ? regionPages.find((p) => p.id === resolvedTarget.locationPageId)?.title ?? 'this region'
      : factionPages.find((p) => p.id === resolvedTarget.orgPageId)?.title ?? 'this faction'
    : null;

  async function handleSubmit() {
    if (!resolvedTarget) {
      setError('Select a propagation target.');
      return;
    }
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await spreadRumor(campaignHandle, {
        sourceClaimId,
        draft,
        targets: [resolvedTarget],
        stance,
        visibility,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Circulation failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-4 shadow-lg space-y-3">
        <h2 className="text-lg font-medium">Circulate</h2>
        <p className="text-sm text-muted line-clamp-3">{preview}</p>
        {!confirmed ? <LoreCirculationExpectationNote /> : null}

        {needsTargetPicker ? (
          <>
            <label className="block text-xs space-y-1">
              <span className="text-muted">Propagation target</span>
              <select
                className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                value={targetKind}
                onChange={(e) => {
                  setTargetKind(e.target.value as 'region' | 'faction');
                  setTargetPageId('');
                }}
              >
                <option value="region">Region (location)</option>
                <option value="faction">Faction (organization)</option>
              </select>
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-muted">
                {targetKind === 'region' ? 'Location page' : 'Organization page'}
              </span>
              <select
                className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                value={targetPageId}
                onChange={(e) => setTargetPageId(e.target.value)}
                disabled={targetOptions.length === 0}
              >
                {targetOptions.length === 0 ? (
                  <option value="">No pages available</option>
                ) : (
                  targetOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))
                )}
              </select>
            </label>
          </>
        ) : null}

        <label className="block text-xs space-y-1">
          <span className="text-muted">Stance</span>
          <select
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
            value={stance}
            onChange={(e) => setStance(e.target.value)}
          >
            {STANCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs space-y-1">
          <span className="text-muted">Visibility</span>
          <select
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
            value={visibility}
            onChange={(e) =>
              setVisibility(e.target.value as 'PARTY' | 'GM_ONLY')
            }
          >
            <option value="GM_ONLY">GM only</option>
            <option value="PARTY">Party visible</option>
          </select>
        </label>
        {confirmed ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Confirm circulation to {targetLabel ?? 'the selected scope'}? This appends a
            chronology event and cannot be edited—use retraction to correct mistakes.
          </p>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded px-3 py-1.5 text-sm text-muted hover:bg-muted/30"
            onClick={() => {
              setConfirmed(false);
              onClose();
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || (needsTargetPicker && !targetPageId)}
            className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
            onClick={() => void handleSubmit()}
          >
            {busy ? 'Saving…' : confirmed ? 'Confirm circulation' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
